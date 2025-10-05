import { useEffect } from 'preact/hooks';
import { currentView } from './signals';
import { cleanupSocketListeners } from './socket';
import Home from './Home';
import Room from './Room';

export default function App() {
  // Cleanup socket listeners and timers on unmount
  useEffect(() => {
    return () => {
      cleanupSocketListeners();
    };
  }, []);

  return (
    <div class="container">
      <h1>Imposter</h1>
      <h2 class="subtitle">Social Deception Role Assignment</h2>
      <p class="tagline">Add hidden imposter or traitor roles to any game. Transform cooperative board games, party games, or group activities by secretly assigning one player as the imposter, thief, saboteur, or traitor.</p>
      {currentView.value === 'home' && <Home />}
      {(currentView.value === 'lobby' || currentView.value === 'countdown' || currentView.value === 'reveal') && <Room />}
    </div>
  );
}
