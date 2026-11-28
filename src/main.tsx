import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { updateSplashProgress } from './game/splashScreen';
import './index.css';

const experimentalRescue=new URLSearchParams(window.location.search).get('experiment')==='rescue3d';
const RescueExperiment=lazy(()=>import('./components/RescueExperiment'));
updateSplashProgress(48);

if (typeof window !== 'undefined') {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    {experimentalRescue?<Suspense fallback={<div role="status">Loading rescue lab…</div>}><RescueExperiment/></Suspense>:<App />}
  </ErrorBoundary>
);
