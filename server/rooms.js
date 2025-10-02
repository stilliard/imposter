const rooms = new Map();

const MAX_PLAYERS = 10;
const MAX_NAME_LENGTH = 20;
const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function validatePlayerName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 1 || name.length > MAX_NAME_LENGTH) return false;
  // Only allow alphanumeric, spaces, and basic punctuation
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) return false;
  return true;
}

function createRoom(playerName) {
  if (!validatePlayerName(playerName)) return null;

  const roomCode = generateRoomCode();
  rooms.set(roomCode, {
    host: playerName,
    players: [playerName],
    sockets: new Map(),
    createdAt: Date.now(),
    lastActivity: Date.now()
  });
  return roomCode;
}

function joinRoom(roomCode, playerName, socketId) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  if (!validatePlayerName(playerName)) return null;
  if (room.players.length >= MAX_PLAYERS) return null;

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

      if (room.players.length === 0) {
        rooms.delete(roomCode);
      }

      return { roomCode, room };
    }
  }
  return null;
}

function selectImposter(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.lastActivity = Date.now();
  const randomIndex = Math.floor(Math.random() * room.players.length);
  return room.players[randomIndex];
}

function cleanupStaleRooms() {
  const now = Date.now();
  for (const [roomCode, room] of rooms.entries()) {
    if (now - room.lastActivity > ROOM_TIMEOUT) {
      console.log(`Cleaning up stale room: ${roomCode}`);
      rooms.delete(roomCode);
    }
  }
}

function isHost(roomCode, playerName) {
  const room = rooms.get(roomCode);
  return room && room.host === playerName;
}

// Run cleanup every 10 minutes
setInterval(cleanupStaleRooms, 10 * 60 * 1000);

module.exports = {
  createRoom,
  joinRoom,
  getRoom,
  removePlayer,
  selectImposter,
  isHost,
  MAX_NAME_LENGTH
};
