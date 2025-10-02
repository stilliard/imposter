import { createName, joinName, roomCode, currentView, isHost } from './signals';
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
    socket.emit('create-room', createName.value.trim());
  };

  const joinRoom = () => {
    if (!joinName.value.trim() || !roomCode.value.trim()) return;
    const code = roomCode.value.trim().toUpperCase();
    if (!validateRoomCode(code)) {
      alert('Invalid room code. Must be 8 alphanumeric characters.');
      return;
    }
    socket.emit('join-room', {
      roomCode: code,
      playerName: joinName.value.trim()
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
            maxLength={MAX_NAME_LENGTH}
          />
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
