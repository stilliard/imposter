import { roomCode, players, isHost, currentView, role, countdown, totalImposters, impostersList, revealedImposters } from './signals';
import { socket } from './socket';

export default function Room() {
  const startGame = () => {
    socket.emit('start-game', roomCode.value);
  };

  const revealImposters = () => {
    socket.emit('reveal-imposters', roomCode.value);
  };

  const playAgain = () => {
    socket.emit('play-again', roomCode.value);
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
        {role.value === 'imposter' && impostersList.value.length > 0 && (
          <p class={role.value} style="margin-top: 1rem; font-size: 0.7rem;">
            Fellow {impostersList.value.length > 1 ? 'imposters' : 'imposter'}: {impostersList.value.join(', ')}
          </p>
        )}
        {revealedImposters.value.length > 0 && (
          <p style="margin-top: 2rem; font-size: 0.8rem; color: #ff6680; border: 2px solid #ff0033; padding: 1rem;">
            {revealedImposters.value.length > 1 ? 'The imposters were' : 'The imposter was'}: {revealedImposters.value.join(', ')}
          </p>
        )}
        <div style="display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap;">
          {revealedImposters.value.length === 0 && (
            <button onClick={revealImposters} class="secondary-btn" style="flex: 1;">
              Reveal Imposters
            </button>
          )}
          {isHost.value && (
            <button onClick={playAgain} style="flex: 1;">
              Play Again
            </button>
          )}
        </div>
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
