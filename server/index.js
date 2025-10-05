require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createRoom, joinRoom, getRoom, removePlayer, selectImposters, isHost } = require('./rooms');

const app = express();
const httpServer = createServer(app);

// Rate limiting map: socketId -> { action -> last timestamp }
const rateLimitMap = new Map();
const RATE_LIMIT_CREATE = 2000; // 2 seconds between room creations
const RATE_LIMIT_JOIN = 1000; // 1 second between join attempts
const RATE_LIMIT_START = 1000; // 1 second between start attempts

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Helper function for rate limiting
function checkRateLimit(socket, action, limitMs) {
  const now = Date.now();
  const socketLimits = rateLimitMap.get(socket.id) || {};
  const lastAction = socketLimits[action];

  if (lastAction && now - lastAction < limitMs) {
    socket.emit('error', 'Too many requests. Please wait.');
    return false;
  }

  socketLimits[action] = now;
  rateLimitMap.set(socket.id, socketLimits);
  return true;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Initialize rate limit tracking for this socket
  rateLimitMap.set(socket.id, {});

  socket.on('create-room', (data) => {
    if (!checkRateLimit(socket, 'create-room', RATE_LIMIT_CREATE)) return;

    // Handle both old format (string) and new format (object)
    const playerName = typeof data === 'string' ? data : data.playerName;
    const maxPlayers = typeof data === 'object' ? data.maxPlayers : undefined;
    const numImposters = typeof data === 'object' ? data.numImposters : undefined;

    const roomCode = createRoom(playerName, maxPlayers, numImposters);
    if (!roomCode) {
      socket.emit('error', 'Cannot create room. Server may be at capacity or name is invalid.');
      return;
    }

    const room = getRoom(roomCode);
    room.sockets.set(socket.id, playerName);

    socket.join(roomCode);
    socket.emit('room-created', {
      roomCode,
      playerName,
      hostName: room.host,
      maxPlayers: room.maxPlayers,
      numImposters: room.numImposters
    });
  });

  socket.on('join-room', ({ roomCode, playerName }) => {
    if (!checkRateLimit(socket, 'join-room', RATE_LIMIT_JOIN)) return;

    const existingRoom = getRoom(roomCode);

    if (!existingRoom) {
      socket.emit('error', 'Room not found');
      return;
    }

    // Check if name is taken by a DIFFERENT socket (allow reconnection with same name)
    const isReconnecting = existingRoom.players.includes(playerName);
    if (isReconnecting) {
      // Find and remove old socket for this player (they're reconnecting)
      for (const [sid, name] of existingRoom.sockets) {
        if (name === playerName && sid !== socket.id) {
          existingRoom.sockets.delete(sid);
          break;
        }
      }
    } else {
      // New player - check if name is already taken
      if (existingRoom.players.includes(playerName)) {
        socket.emit('error', 'Name already taken');
        return;
      }
    }

    const room = joinRoom(roomCode, playerName, socket.id);

    if (!room) {
      socket.emit('error', 'Cannot join room. It may be full or name is invalid.');
      return;
    }

    socket.join(roomCode);
    socket.emit('room-joined', {
      roomCode,
      players: room.players,
      hostName: room.host,
      maxPlayers: room.maxPlayers,
      numImposters: room.numImposters,
      isHost: isHost(roomCode, playerName)
    });
    socket.to(roomCode).emit('players-updated', { players: room.players });
  });

  socket.on('start-game', (roomCode) => {
    if (!checkRateLimit(socket, 'start-game', RATE_LIMIT_START)) return;

    const room = getRoom(roomCode);
    if (!room) return;

    // Validate that the socket is the host
    const playerName = room.sockets.get(socket.id);
    if (!isHost(roomCode, playerName)) {
      socket.emit('error', 'Only the host can start the game');
      return;
    }

    if (room.players.length < 2) {
      socket.emit('error', 'Need at least 2 players to start');
      return;
    }

    const imposters = selectImposters(roomCode);
    room.imposters = imposters; // Store for reveal later

    for (const [sid, playerName] of room.sockets) {
      const isImposter = imposters.includes(playerName);
      io.to(sid).emit('game-started', {
        role: isImposter ? 'imposter' : 'player',
        totalImposters: imposters.length,
        // Only send imposters list to imposters themselves
        imposters: isImposter ? imposters.filter(name => name !== playerName) : []
      });
    }
  });

  socket.on('reveal-imposters', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room || !room.imposters) return;

    io.to(roomCode).emit('imposters-revealed', {
      imposters: room.imposters
    });
  });

  socket.on('play-again', (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return;

    // Validate that the socket is the host
    const playerName = room.sockets.get(socket.id);
    if (!isHost(roomCode, playerName)) {
      socket.emit('error', 'Only the host can restart the game');
      return;
    }

    // Clear game state
    delete room.imposters;

    io.to(roomCode).emit('game-reset');
  });

  socket.on('update-settings', (data) => {
    const { roomCode, maxPlayers, numImposters } = data;
    const room = getRoom(roomCode);
    if (!room) return;

    // Validate that the socket is the host
    const playerName = room.sockets.get(socket.id);
    if (!isHost(roomCode, playerName)) {
      socket.emit('error', 'Only the host can change settings');
      return;
    }

    // Validate and update settings
    const validMaxPlayers = Math.max(2, Math.min(10, parseInt(maxPlayers) || 10));
    const validNumImposters = Math.max(1, Math.min(Math.floor(validMaxPlayers / 2), parseInt(numImposters) || 1));

    room.maxPlayers = validMaxPlayers;
    room.numImposters = validNumImposters;

    // Broadcast updated settings to all players
    io.to(roomCode).emit('settings-updated', {
      maxPlayers: validMaxPlayers,
      numImposters: validNumImposters
    });
  });

  socket.on('disconnect', () => {
    const result = removePlayer(socket.id);
    if (result) {
      socket.to(result.roomCode).emit('players-updated', {
        players: result.room.players
      });
    }
    rateLimitMap.delete(socket.id);
    console.log('Client disconnected:', socket.id);
  });
});

// Cleanup rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [socketId, actions] of rateLimitMap.entries()) {
    // Check if all actions are older than 2 minutes
    const allOld = Object.values(actions).every(timestamp => now - timestamp > 120000);
    if (allOld) {
      rateLimitMap.delete(socketId);
    }
  }
}, 60000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
