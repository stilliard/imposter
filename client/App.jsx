import { currentView } from './signals';
import Home from './Home';
import Room from './Room';

export default function App() {
  return (
    <div class="container">
      <h1>Imposter Game</h1>
      {currentView.value === 'home' && <Home />}
      {(currentView.value === 'lobby' || currentView.value === 'countdown' || currentView.value === 'reveal') && <Room />}
    </div>
  );
}
