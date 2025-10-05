import { io } from 'socket.io-client';
import { roomCode, currentView, players, isHost, role, countdown, totalImposters, impostersList, revealedImposters, maxPlayers, numImposters } from './signals';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  withCredentials: true
});

// Event handler functions (for proper cleanup)
const onRoomCreated = (data) => {
  roomCode.value = data.roomCode;
  isHost.value = true;
  players.value = [data.playerName];
  maxPlayers.value = data.maxPlayers || 10;
  numImposters.value = data.numImposters || 1;
  currentView.value = 'lobby';
};

const onRoomJoined = (data) => {
  roomCode.value = data.roomCode;
  players.value = data.players;
  maxPlayers.value = data.maxPlayers || 10;
  numImposters.value = data.numImposters || 1;
  currentView.value = 'lobby';
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
