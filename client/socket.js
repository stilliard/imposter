import { io } from 'socket.io-client';
import { roomCode, currentView, players, isHost, role, countdown } from './signals';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  withCredentials: true
});

socket.on('room-created', (data) => {
  roomCode.value = data.roomCode;
  isHost.value = true;
  players.value = [data.playerName];
  currentView.value = 'lobby';
});

socket.on('room-joined', (data) => {
  roomCode.value = data.roomCode;
  players.value = data.players;
  currentView.value = 'lobby';
});

socket.on('players-updated', (data) => {
  players.value = data.players;
});

let countdownInterval = null;
let countdownTimeout = null;

socket.on('game-started', (data) => {
  // Clear any existing countdown interval/timeout
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  if (countdownTimeout) {
    clearTimeout(countdownTimeout);
  }

  role.value = data.role;
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
});

socket.on('error', (message) => {
  alert(message);
});
