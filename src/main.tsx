import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { AdventureSlicePreview } from './components/AdventureSlicePreview';
import { ErrorBoundary } from './components/ErrorBoundary';
import { updateSplashProgress } from './game/splashScreen';
import './index.css';

updateSplashProgress(48);

// This draft branch is a dedicated test build. The accepted game is opt-in.
const legacyGame = new URLSearchParams(window.location.search).get('legacyGame') === '1';
if (legacyGame) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    {legacyGame ? <App /> : <AdventureSlicePreview />}
  </ErrorBoundary>
);
