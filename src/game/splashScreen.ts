declare global {
  interface Window {
    __sparkbotSplashStart?: number;
  }
}

let highestProgress = 18;
let dismissed = false;

export function clampSplashProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function updateSplashProgress(percent: number, statusLabel?: string): void {
  if (typeof document === 'undefined' || dismissed) return;
  const clamped = clampSplashProgress(percent);
  highestProgress = Math.max(highestProgress, clamped);

  const bar = document.getElementById('app-splash-bar-fill');
  if (bar) {
    bar.style.transform = `scaleX(${(highestProgress / 100).toFixed(3)})`;
  }

  const splash = document.getElementById('app-splash');
  if (splash) {
    splash.setAttribute('aria-valuenow', String(highestProgress));
  }

  if (statusLabel) {
    const statusEl = document.getElementById('app-splash-status');
    if (statusEl) {
      statusEl.textContent = statusLabel;
    }
  }
}

export function dismissSplashScreen(options?: { minVisibleMs?: number }): void {
  if (typeof document === 'undefined' || dismissed) return;
  dismissed = true;

  const splash = document.getElementById('app-splash');
  if (!splash) {
    document.body.dataset.splash = 'done';
    return;
  }

  const bar = document.getElementById('app-splash-bar-fill');
  if (bar) {
    bar.style.transform = 'scaleX(1)';
  }
  const statusEl = document.getElementById('app-splash-status');
  if (statusEl) {
    statusEl.textContent = 'Ready!';
  }
  splash.setAttribute('aria-valuenow', '100');

  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const skipHold =
    params?.get('autostart') === '1' || params?.get('launch') === 'planet';

  const minVisibleMs = skipHold ? 0 : (options?.minVisibleMs ?? 580);
  const startedAt =
    typeof window !== 'undefined' && typeof window.__sparkbotSplashStart === 'number'
      ? window.__sparkbotSplashStart
      : 0;
  const elapsed =
    typeof performance !== 'undefined' && startedAt > 0
      ? performance.now() - startedAt
      : minVisibleMs;
  const remainingMs = Math.max(0, Math.round(minVisibleMs - elapsed));

  const hideNow = () => {
    splash.classList.add('is-hidden');
    splash.setAttribute('aria-hidden', 'true');
    document.body.dataset.splash = 'done';
    window.setTimeout(() => {
      splash.remove();
    }, 420);
  };

  if (remainingMs > 0 && typeof window !== 'undefined') {
    window.setTimeout(hideNow, remainingMs);
  } else {
    hideNow();
  }
}
