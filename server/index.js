const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createRoom, joinRoom, getRoom, removePlayer, selectImposter, isHost } = require('./rooms');

const app = express();
const httpServer = createServer(app);

// Rate limiting map: socketId -> last action timestamp
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 2000; // 2 seconds between room creations

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-room', (playerName) => {
    // Rate limiting
    const now = Date.now();
    const lastAction = rateLimitMap.get(socket.id);
    if (lastAction && now - lastAction < RATE_LIMIT_MS) {
      socket.emit('error', 'Too many requests. Please wait.');
      return;
    }
    rateLimitMap.set(socket.id, now);

    const roomCode = createRoom(playerName);
    if (!roomCode) {
      socket.emit('error', 'Invalid name. Use 1-20 alphanumeric characters.');
      return;
    }

    const room = getRoom(roomCode);
    room.sockets.set(socket.id, playerName);

    socket.join(roomCode);
    socket.emit('room-created', { roomCode, playerName });
  });

  socket.on('join-room', ({ roomCode, playerName }) => {
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
  for (const [socketId, timestamp] of rateLimitMap.entries()) {
    if (now - timestamp > 60000) { // Remove entries older than 1 minute
      rateLimitMap.delete(socketId);
    }
  }
}, 60000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
