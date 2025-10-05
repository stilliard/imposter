import { roomCode, players, isHost, currentView, role, countdown, totalImposters } from './signals';
import { socket } from './socket';

export default function Room() {
  const startGame = () => {
    socket.emit('start-game', roomCode.value);
  };

  const copyLink = () => {
    const link = `${window.location.origin}?room=${roomCode.value}`;
    navigator.clipboard.writeText(link);
  };

  if (currentView.value === 'countdown') {
    return (
      <div class="countdown">
        <div class="countdown-number">{countdown.value}</div>
      </div>
    );
  }

  if (currentView.value === 'reveal') {
    return (
      <div class="reveal">
        <h2>You are {role.value === 'imposter' ? (totalImposters.value > 1 ? 'an IMPOSTER' : 'the IMPOSTER') : 'a PLAYER'}</h2>
        <p class={role.value}>
          {role.value === 'imposter'
            ? `[!] Eliminate the players without getting caught!${totalImposters.value > 1 ? ' Work with your fellow imposters!' : ''}`
            : `[OK] Find the ${totalImposters.value > 1 ? totalImposters.value + ' imposters' : 'imposter'} among you!`}
        </p>
      </div>
    );
  }

  return (
    <div class="lobby">
      <div class="room-info">
        <h2>Room: {roomCode.value}</h2>
        <button onClick={copyLink}>Copy Link</button>
      </div>

      <div class="players-list">
        <h3>Players ({players.value.length})</h3>
        <ul>
          {players.value.map(player => (
            <li key={player}>{player}</li>
          ))}
        </ul>
      </div>

      {isHost.value && (
        <button
          class="start-btn"
          onClick={startGame}
          disabled={players.value.length < 2}
        >
          Start Game
        </button>
      )}

      {!isHost.value && <p class="waiting">Waiting for host to start...</p>}
    </div>
  );
}
