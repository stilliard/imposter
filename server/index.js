const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createRoom, joinRoom, getRoom, removePlayer, selectImposter, isHost } = require('./rooms');

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

  socket.on('create-room', (playerName) => {
    if (!checkRateLimit(socket, 'create-room', RATE_LIMIT_CREATE)) return;

    const roomCode = createRoom(playerName);
    if (!roomCode) {
      socket.emit('error', 'Cannot create room. Server may be at capacity or name is invalid.');
      return;
    }

    const room = getRoom(roomCode);
    room.sockets.set(socket.id, playerName);

    socket.join(roomCode);
    socket.emit('room-created', { roomCode, playerName });
  });

  socket.on('join-room', ({ roomCode, playerName }) => {
    if (!checkRateLimit(socket, 'join-room', RATE_LIMIT_JOIN)) return;

    const existingRoom = getRoom(roomCode);

    if (!existingRoom) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (existingRoom.players.includes(playerName)) {
      socket.emit('error', 'Name already taken');
      return;
    }

    const room = joinRoom(roomCode, playerName, socket.id);

    if (!room) {
      socket.emit('error', 'Cannot join room. It may be full or name is invalid.');
      return;
    }

    socket.join(roomCode);
    socket.emit('room-joined', { roomCode, players: room.players });
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

    const imposter = selectImposter(roomCode);

    for (const [sid, playerName] of room.sockets) {
      io.to(sid).emit('game-started', {
        role: playerName === imposter ? 'imposter' : 'crew'
      });
    }
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
