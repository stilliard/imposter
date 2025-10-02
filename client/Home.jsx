import { createName, joinName, roomCode, currentView, isHost } from './signals';
import { socket } from './socket';

export default function Home() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlRoomCode = urlParams.get('room');

  if (urlRoomCode && !roomCode.value) {
    roomCode.value = urlRoomCode;
  }

  const createRoom = () => {
    if (!createName.value.trim()) return;
    socket.emit('create-room', createName.value.trim());
  };

  const joinRoom = () => {
    if (!joinName.value.trim() || !roomCode.value.trim()) return;
    socket.emit('join-room', {
      roomCode: roomCode.value.trim().toUpperCase(),
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
          />
          <input
            type="text"
            placeholder="Room code"
            value={roomCode.value}
            onInput={(e) => roomCode.value = e.target.value.toUpperCase()}
          />
          <button onClick={joinRoom}>Join</button>
        </div>
      </div>
    </div>
  );
}
