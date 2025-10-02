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
      <h1>Imposter Game</h1>
      {currentView.value === 'home' && <Home />}
      {(currentView.value === 'lobby' || currentView.value === 'countdown' || currentView.value === 'reveal') && <Room />}
    </div>
  );
}
