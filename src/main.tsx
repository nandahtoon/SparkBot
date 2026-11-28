import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { updateSplashProgress } from './game/splashScreen';
import './index.css';

const GalacticAdventure = lazy(() => import('./components/GalacticAdventure'));
const galactic = new URLSearchParams(window.location.search).get('experiment') === 'galactic';
updateSplashProgress(48);

if (typeof window !== 'undefined') {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    {galactic ? <Suspense fallback={<div role="status">Opening Galactic Adventure…</div>}><GalacticAdventure /></Suspense> : <App />}
  </ErrorBoundary>
);
