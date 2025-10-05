const crypto = require('crypto');

const rooms = new Map();

const MAX_PLAYERS = 10;
const MAX_NAME_LENGTH = 20;
const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const EMPTY_ROOM_TIMEOUT = 5 * 60 * 1000; // 5 minutes for empty rooms
const MAX_ROOM_AGE = 2 * 60 * 60 * 1000; // 2 hours max age
const MAX_ROOMS = 1000; // Maximum number of concurrent rooms
const ROOM_CODE_LENGTH = 8;

function generateRoomCode() {
  // Use crypto for secure random room codes (base36: 0-9, a-z)
  // 8 chars of base36 = 36^8 = ~2.8 trillion combinations
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[bytes[i % bytes.length] % 36];
  }
  return code;
}

function validateRoomCode(roomCode) {
  if (!roomCode || typeof roomCode !== 'string') return false;
  if (roomCode.length !== ROOM_CODE_LENGTH) return false;
  // Only allow alphanumeric characters
  if (!/^[A-Z0-9]+$/.test(roomCode)) return false;
  return true;
}

function validatePlayerName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 1 || name.length > MAX_NAME_LENGTH) return false;
  // Only allow alphanumeric, spaces, and basic punctuation
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) return false;
  return true;
}

function createRoom(playerName, maxPlayers = MAX_PLAYERS, numImposters = 1, requestedRoomCode = null) {
  if (!validatePlayerName(playerName)) return null;

  // Validate maxPlayers (must be between 2 and MAX_PLAYERS)
  const validMaxPlayers = Math.max(2, Math.min(MAX_PLAYERS, parseInt(maxPlayers) || MAX_PLAYERS));

  // Validate numImposters (must be between 1 and half of maxPlayers)
  const validNumImposters = Math.max(1, Math.min(Math.floor(validMaxPlayers / 2), parseInt(numImposters) || 1));

  // Check if we've hit the maximum rooms limit
  if (rooms.size >= MAX_ROOMS) {
    console.log('Maximum rooms limit reached');
    return null;
  }

  // Use requested room code if provided and valid, otherwise generate new one
  let roomCode;
  if (requestedRoomCode && validateRoomCode(requestedRoomCode)) {
    // Check if room code already exists
    if (rooms.has(requestedRoomCode)) {
      console.log('Requested room code already exists');
      return null;
    }
    roomCode = requestedRoomCode;
  } else {
    roomCode = generateRoomCode();
  }

  rooms.set(roomCode, {
    host: playerName,
    players: [playerName],
    sockets: new Map(),
    createdAt: Date.now(),
    lastActivity: Date.now(),
    maxPlayers: validMaxPlayers,
    numImposters: validNumImposters
  });
  return roomCode;
}

function joinRoom(roomCode, playerName, socketId) {
  if (!validateRoomCode(roomCode)) return null;

  const room = rooms.get(roomCode);
  if (!room) return null;
  if (!validatePlayerName(playerName)) return null;

  // Use room.maxPlayers if it exists, otherwise fall back to MAX_PLAYERS
  const maxPlayersLimit = room.maxPlayers || MAX_PLAYERS;
  console.log(`Join attempt: room ${roomCode}, players: ${room.players.length}/${maxPlayersLimit}, new player: ${playerName}`);

  if (room.players.length >= maxPlayersLimit) {
    console.log(`Room full: ${room.players.length} >= ${maxPlayersLimit}`);
    return null;
  }

  if (!room.players.includes(playerName)) {
    room.players.push(playerName);
  }
  room.sockets.set(socketId, playerName);
  room.lastActivity = Date.now();
  return room;
}

function getRoom(roomCode) {
  return rooms.get(roomCode);
}

function removePlayer(socketId) {
  for (const [roomCode, room] of rooms.entries()) {
    if (room.sockets.has(socketId)) {
      const playerName = room.sockets.get(socketId);
      room.sockets.delete(socketId);
      room.players = room.players.filter(p => p !== playerName);

      // Don't immediately delete empty rooms - give them a grace period
      // Update lastActivity so cleanup function can handle it
      room.lastActivity = Date.now();

      return { roomCode, room };
    }
  }
  return null;
}

function selectImposters(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return [];

  room.lastActivity = Date.now();

  const numToSelect = Math.min(room.numImposters || 1, room.players.length - 1);
  const shuffled = [...room.players].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numToSelect);
}

function cleanupStaleRooms() {
  const now = Date.now();
  for (const [roomCode, room] of rooms.entries()) {
    const isEmptyRoom = room.players.length === 0;
    const timeout = isEmptyRoom ? EMPTY_ROOM_TIMEOUT : ROOM_TIMEOUT;

    // Clean up rooms that are inactive OR have exceeded max age
    // Empty rooms get a shorter timeout (5 min) vs active rooms (30 min)
    if (now - room.lastActivity > timeout || now - room.createdAt > MAX_ROOM_AGE) {
      console.log(`Cleaning up ${isEmptyRoom ? 'empty' : 'stale'} room: ${roomCode}`);
      rooms.delete(roomCode);
    }
  }
}

function isHost(roomCode, playerName) {
  const room = rooms.get(roomCode);
  return room && room.host === playerName;
}

// Run cleanup every 5 minutes for more frequent cleanup
setInterval(cleanupStaleRooms, 5 * 60 * 1000);

module.exports = {
  createRoom,
  joinRoom,
  getRoom,
  removePlayer,
  selectImposters,
  isHost,
  MAX_NAME_LENGTH
};
