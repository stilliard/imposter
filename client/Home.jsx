import { createName, joinName, roomCode, currentView, isHost, maxPlayers, numImposters, playerName } from './signals';
import { socket } from './socket';

const MAX_NAME_LENGTH = 20;
const ROOM_CODE_LENGTH = 8;

function validateRoomCode(code) {
  if (!code || typeof code !== 'string') return false;
  if (code.length !== ROOM_CODE_LENGTH) return false;
  if (!/^[A-Z0-9]+$/.test(code)) return false;
  return true;
}

export default function Home() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlRoomCode = urlParams.get('room')?.toUpperCase();

  // Validate room code from URL to prevent XSS
  if (urlRoomCode && validateRoomCode(urlRoomCode) && !roomCode.value) {
    roomCode.value = urlRoomCode;
  }

  const createRoom = () => {
    if (!createName.value.trim()) return;
    playerName.value = createName.value.trim();
    socket.emit('create-room', {
      playerName: playerName.value,
      maxPlayers: maxPlayers.value,
      numImposters: numImposters.value
    });
  };

  const joinRoom = () => {
    if (!joinName.value.trim() || !roomCode.value.trim()) return;
    const code = roomCode.value.trim().toUpperCase();
    if (!validateRoomCode(code)) {
      alert('Invalid room code. Must be 8 alphanumeric characters.');
      return;
    }
    playerName.value = joinName.value.trim();
    socket.emit('join-room', {
      roomCode: code,
      playerName: playerName.value
    });
  };

  const showBothBlocks = () => {
    window.history.pushState({}, '', window.location.pathname);
    roomCode.value = '';
  };

  if (urlRoomCode) {
    return (
      <div class="home">
        <div class="join-only">
          <div class="block">
            <h2>Join Room {urlRoomCode}</h2>
            <input
              type="text"
              placeholder="Your name"
              value={joinName.value}
              onInput={(e) => joinName.value = e.target.value}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  joinRoom();
                  return;
                }
              }}
              maxLength={MAX_NAME_LENGTH}
            />
            <button onClick={joinRoom}>Join</button>
          </div>
          <button class="secondary-btn" onClick={showBothBlocks}>
            Create a room instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="home">
      <div class="blocks">
        <div class="block">
          <h2>Create Room</h2>
          <input
            type="text"
            placeholder="Your name"
            value={createName.value}
            onInput={(e) => createName.value = e.target.value}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                createRoom();
              }
            }}
            maxLength={MAX_NAME_LENGTH}
          />
          <select
            value={maxPlayers.value}
            onChange={(e) => {
              const newMax = parseInt(e.target.value);
              maxPlayers.value = newMax;
              // Cap imposters at half the max players (minimum 1)
              const maxImposters = Math.max(1, Math.floor(newMax / 2));
              if (numImposters.value > maxImposters) {
                numImposters.value = maxImposters;
              }
            }}
          >
            <option value={2}>2 players max</option>
            <option value={3}>3 players max</option>
            <option value={4}>4 players max</option>
            <option value={5}>5 players max</option>
            <option value={6}>6 players max</option>
            <option value={7}>7 players max</option>
            <option value={8}>8 players max</option>
            <option value={9}>9 players max</option>
            <option value={10}>10 players max</option>
          </select>
          <select
            value={numImposters.value}
            onChange={(e) => numImposters.value = parseInt(e.target.value)}
          >
            {Array.from({ length: Math.max(1, Math.floor(maxPlayers.value / 2)) }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>
                {num} imposter{num > 1 ? 's' : ''}
              </option>
            ))}
          </select>
          <button onClick={createRoom}>Create</button>
        </div>

        <div class="block">
          <h2>Join Room</h2>
          <input
            type="text"
            placeholder="Your name"
            value={joinName.value}
            onInput={(e) => joinName.value = e.target.value}
            maxLength={MAX_NAME_LENGTH}
          />
          <input
            type="text"
            placeholder="Room code"
            value={roomCode.value}
            onInput={(e) => roomCode.value = e.target.value.toUpperCase()}
            maxLength={ROOM_CODE_LENGTH}
          />
          <button onClick={joinRoom}>Join</button>
        </div>
      </div>
    </div>
  );
}
