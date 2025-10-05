import { roomCode, players, isHost, currentView, role, countdown, totalImposters, impostersList, revealedImposters, maxPlayers, numImposters } from './signals';
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

  const leaveRoom = () => {
    // Disconnect and reset to home
    socket.disconnect();
    socket.connect();
    currentView.value = 'home';
    roomCode.value = '';
    players.value = [];
    isHost.value = false;
    role.value = null;
    revealedImposters.value = [];
    impostersList.value = [];
    window.history.pushState({}, '', '/');
  };

  const updateMaxPlayers = (newMax) => {
    socket.emit('update-settings', {
      roomCode: roomCode.value,
      maxPlayers: newMax,
      numImposters: numImposters.value
    });
  };

  const updateNumImposters = (newNum) => {
    socket.emit('update-settings', {
      roomCode: roomCode.value,
      maxPlayers: maxPlayers.value,
      numImposters: newNum
    });
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
          <p class={`${role.value} fellow-imposters`}>
            Fellow {impostersList.value.length > 1 ? 'imposters' : 'imposter'}: {impostersList.value.join(', ')}
          </p>
        )}
        {revealedImposters.value.length > 0 && (
          <p class="revealed-imposters">
            {revealedImposters.value.length > 1 ? 'The imposters were' : 'The imposter was'}: {revealedImposters.value.join(', ')}
          </p>
        )}
        <div class="reveal-actions">
          {revealedImposters.value.length === 0 && (
            <button onClick={revealImposters} class="secondary-btn">
              Reveal Imposters
            </button>
          )}
          {isHost.value && (
            <button onClick={playAgain}>
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
        <div class="settings-row">
          <select
            value={maxPlayers.value}
            onChange={(e) => {
              const newMax = parseInt(e.target.value);
              maxPlayers.value = newMax;
              const maxImposters = Math.max(1, Math.floor(newMax / 2));
              if (numImposters.value > maxImposters) {
                numImposters.value = maxImposters;
                updateMaxPlayers(newMax);
              } else {
                updateMaxPlayers(newMax);
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
            onChange={(e) => {
              const newNum = parseInt(e.target.value);
              numImposters.value = newNum;
              updateNumImposters(newNum);
            }}
          >
            {Array.from({ length: Math.max(1, Math.floor(maxPlayers.value / 2)) }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>
                {num} imposter{num > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {isHost.value && (
        <button
          class="start-btn"
          onClick={startGame}
          disabled={players.value.length < 2}
        >
          Start Game
        </button>
      )}

      {!isHost.value && (
        <div>
          <p class="settings-display">
            Max players: {maxPlayers.value} | Imposters: {numImposters.value}
          </p>
          <p class="waiting">Waiting for host to start...</p>
        </div>
      )}

      <button onClick={leaveRoom} class="secondary-btn leave-btn" style="margin-top: 2rem;">
        Leave Room
      </button>
    </div>
  );
}
