import { io } from 'socket.io-client';
import { roomCode, currentView, players, isHost, role, countdown, totalImposters, impostersList, revealedImposters, maxPlayers, numImposters, playerName, hostName } from './signals';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  withCredentials: true
});

// Track if we're currently trying to auto-reconnect
let isAutoReconnecting = false;

// Handle reconnection - auto-rejoin room if we were in one
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);

  // If we were in a room and have player info, try to rejoin
  if (roomCode.value && playerName.value && currentView.value !== 'home') {
    console.log('Reconnecting to room:', roomCode.value, 'as', playerName.value);
    isAutoReconnecting = true;
    socket.emit('join-room', {
      roomCode: roomCode.value,
      playerName: playerName.value
    });
  }
});

// Event handler functions (for proper cleanup)
const onRoomCreated = (data) => {
  roomCode.value = data.roomCode;
  playerName.value = data.playerName;
  hostName.value = data.hostName;
  isHost.value = true;
  players.value = [data.playerName];
  maxPlayers.value = data.maxPlayers || 10;
  numImposters.value = data.numImposters || 1;
  currentView.value = 'lobby';
  isAutoReconnecting = false; // Successfully created/recreated room

  // Update URL so host can easily share by copying from address bar
  window.history.pushState({}, '', `?room=${data.roomCode}`);
};

const onRoomJoined = (data) => {
  roomCode.value = data.roomCode;
  players.value = data.players;
  hostName.value = data.hostName;
  isHost.value = data.isHost || false;
  maxPlayers.value = data.maxPlayers || 10;
  numImposters.value = data.numImposters || 1;
  currentView.value = 'lobby';
  isAutoReconnecting = false; // Successfully rejoined
};

const onPlayersUpdated = (data) => {
  players.value = data.players;
};

socket.on('room-created', onRoomCreated);
socket.on('room-joined', onRoomJoined);
socket.on('players-updated', onPlayersUpdated);

let countdownInterval = null;
let countdownTimeout = null;

// Cleanup function for timers
export function cleanupTimers() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (countdownTimeout) {
    clearTimeout(countdownTimeout);
    countdownTimeout = null;
  }
}

const onGameStarted = (data) => {
  // Clear any existing countdown interval/timeout
  cleanupTimers();

  role.value = data.role;
  totalImposters.value = data.totalImposters || 1;
  impostersList.value = data.imposters || [];
  countdown.value = 3;
  currentView.value = 'countdown';

  countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value === 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      countdownTimeout = setTimeout(() => {
        currentView.value = 'reveal';
      }, 1200);
    }
  }, 1200);
};

const onError = (message) => {
  // If we're auto-reconnecting as host and room not found, recreate it with same code
  if (isAutoReconnecting && message === 'Room not found' && isHost.value) {
    console.log('Room not found during reconnect. Recreating as host with code:', roomCode.value);
    isAutoReconnecting = false;
    socket.emit('create-room', {
      playerName: playerName.value,
      maxPlayers: maxPlayers.value,
      numImposters: numImposters.value,
      roomCode: roomCode.value
    });
    return;
  }

  isAutoReconnecting = false;
  alert(message);
};

const onImpostersRevealed = (data) => {
  revealedImposters.value = data.imposters;
};

const onGameReset = () => {
  currentView.value = 'lobby';
  role.value = null;
  revealedImposters.value = [];
  impostersList.value = [];
  countdown.value = 3;
  cleanupTimers();
};

const onSettingsUpdated = (data) => {
  maxPlayers.value = data.maxPlayers;
  numImposters.value = data.numImposters;
};

socket.on('game-started', onGameStarted);
socket.on('error', onError);
socket.on('imposters-revealed', onImpostersRevealed);
socket.on('game-reset', onGameReset);
socket.on('settings-updated', onSettingsUpdated);

// Cleanup function to remove all listeners
export function cleanupSocketListeners() {
  socket.off('room-created', onRoomCreated);
  socket.off('room-joined', onRoomJoined);
  socket.off('players-updated', onPlayersUpdated);
  socket.off('game-started', onGameStarted);
  socket.off('error', onError);
  socket.off('imposters-revealed', onImpostersRevealed);
  socket.off('game-reset', onGameReset);
  socket.off('settings-updated', onSettingsUpdated);
  cleanupTimers();
}
