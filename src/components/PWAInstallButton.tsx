import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, X, CheckCircle2, Share2, MoreVertical, Package } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { HAPTICS } from '../game/androidApp';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, platform, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    HAPTICS.trigger('tap');
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        HAPTICS.trigger('victory');
      }
      return;
    }
    setShowGuide(true);
  };

  const buttonLabel = isInstallable
    ? platform === 'android'
      ? 'Install Android App'
      : 'Install App'
    : 'Android App';

  const modal = showGuide && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Install SparkBot App"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[88dvh] overflow-y-auto no-scrollbar rounded-3xl bg-slate-900/95 border border-emerald-400/35 shadow-2xl p-5 sm:p-6 text-slate-100"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-white">
                    Install SparkBot on Android
                  </h2>
                  <p className="text-xs text-slate-300">
                    Full-screen offline app with tactile haptics &amp; Back navigation
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="closeInstallGuideBtn"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div
                className={`rounded-2xl p-3.5 border ${
                  platform === 'android'
                    ? 'bg-emerald-500/12 border-emerald-400/40'
                    : 'bg-slate-800/75 border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-300 mb-2">
                  <MoreVertical className="w-4 h-4 shrink-0" />
                  <span>Android (Chrome / Edge / Samsung Internet)</span>
                </div>
                <ol className="text-xs text-slate-200 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>
                    Tap the browser menu button (<span className="font-bold text-white">⋮</span>) in the top-right corner.
                  </li>
                  <li>
                    Choose <span className="font-bold text-emerald-300">Install app</span> or{' '}
                    <span className="font-bold text-emerald-300">Add to Home screen</span>.
                  </li>
                  <li>
                    Launch <span className="font-bold text-white">SparkBot</span> right from your Android home screen — works offline!
                  </li>
                </ol>
              </div>

              <div
                className={`rounded-2xl p-3.5 border ${
                  platform === 'ios'
                    ? 'bg-sky-500/12 border-sky-400/40'
                    : 'bg-slate-800/75 border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-sky-300 mb-2">
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span>iPhone &amp; iPad (Safari)</span>
                </div>
                <ol className="text-xs text-slate-200 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>
                    Tap the <span className="font-bold text-white">Share</span> button at the bottom of Safari.
                  </li>
                  <li>
                    Scroll and tap <span className="font-bold text-sky-300">Add to Home Screen</span>, then tap{' '}
                    <span className="font-bold text-white">Add</span>.
                  </li>
                </ol>
              </div>

              <div className="rounded-2xl p-3.5 bg-slate-800/60 border border-indigo-400/25">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 mb-1.5">
                  <Package className="w-4 h-4 shrink-0" />
                  <span>Native Android APK / Play Store Export</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Pre-configured for Capacitor (<span className="font-mono text-indigo-200">com.sparkbot.academy</span>). Run{' '}
                  <span className="font-mono text-amber-300">npm run android:sync</span> to build a native Android Studio APK/AAB.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Offline Ready • No Account Needed</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  if (variant === 'settings') {
    return (
      <>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-300">
              <Smartphone className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold uppercase tracking-wider text-white">
                Android App
              </div>
              <div className="text-[11px] font-medium leading-tight text-slate-300">
                {isInstallable
                  ? 'One-tap offline home screen install'
                  : 'Install offline or export Android APK'}
              </div>
            </div>
          </div>
          <button
            type="button"
            id="settingsPwaInstallBtn"
            onClick={handleClick}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-400 px-3 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-300 active:scale-95 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isInstallable ? 'Install' : 'Install Guide'}</span>
          </button>
        </div>
        {modal}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        id="pwaInstallBtn"
        onClick={handleClick}
        aria-label={buttonLabel}
        title={buttonLabel}
        className="flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-400/60 bg-slate-900/90 text-xs font-extrabold text-emerald-200 shadow-md backdrop-blur-sm transition-transform hover:border-emerald-300 hover:text-white active:scale-95 sm:h-10 sm:w-auto sm:px-3 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5 shrink-0 text-emerald-300 sm:h-4 sm:w-4" />
        <span className="hidden lg:inline whitespace-nowrap">{buttonLabel}</span>
      </button>
      {modal}
    </>
  );
};
