import { signal } from '@preact/signals';

export const createName = signal('');
export const joinName = signal('');
export const roomCode = signal('');
export const currentView = signal('home'); // 'home' | 'lobby' | 'countdown' | 'reveal'
export const players = signal([]);
export const isHost = signal(false);
export const role = signal(null); // 'imposter' | 'player'
export const countdown = signal(3);
export const maxPlayers = signal(10);
