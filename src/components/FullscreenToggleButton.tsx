import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { HAPTICS, isStandaloneDisplayMode } from '../game/androidApp';

export const FullscreenToggleButton: React.FC = () => {
  const [supported, setSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    // Hide inside native Capacitor app or already-installed standalone fullscreen PWA
    if (isStandaloneDisplayMode(window)) {
      setSupported(false);
      return;
    }
    const canFs = Boolean(
      document.fullscreenEnabled ||
        (document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled
    );
    setSupported(canFs);

    const sync = () => {
      const fsEl =
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement;
      setIsFullscreen(Boolean(fsEl));
    };
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  if (!supported) return null;

  const toggle = async () => {
    HAPTICS.trigger('tap');
    try {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        webkitExitFullscreen?: () => Promise<void> | void;
      };
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
      };
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      } else {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      }
    } catch {
      // Gracefully ignore if browser blocks fullscreen outside gesture
    }
  };

  return (
    <button
      id="tabletFullscreenBtn"
      type="button"
      onClick={toggle}
      aria-label={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
      title={isFullscreen ? 'Exit Full Screen' : 'Full-Frame Tablet View'}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border shadow-md backdrop-blur-sm transition-transform active:scale-95 sm:h-10 sm:w-10 cursor-pointer ${
        isFullscreen
          ? 'border-sky-400 bg-sky-500/20 text-sky-200'
          : 'border-slate-600/80 bg-slate-900/90 text-slate-100 hover:border-sky-400'
      }`}
    >
      {isFullscreen ? (
        <Minimize2 className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
      ) : (
        <Maximize2 className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
      )}
    </button>
  );
};
