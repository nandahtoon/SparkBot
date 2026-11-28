import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { AdventureSlicePreview } from './components/AdventureSlicePreview';
import { ErrorBoundary } from './components/ErrorBoundary';
import { updateSplashProgress } from './game/splashScreen';
import './index.css';

updateSplashProgress(48);

if (typeof window !== 'undefined') {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    {new URLSearchParams(window.location.search).get('campaignTest') === '1' ? <AdventureSlicePreview /> : <App />}
  </ErrorBoundary>
);
