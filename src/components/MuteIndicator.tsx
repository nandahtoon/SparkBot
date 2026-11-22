import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function useMuteFlash(muted: boolean, durationMs = 1800) {
  const prevMutedRef = useRef<boolean>(muted);
  const timerRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (prevMutedRef.current === muted) return;
    prevMutedRef.current = muted;
    setVisible(true);
    setFlashKey((k) => k + 1);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, durationMs);
  }, [durationMs, muted]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { visible, flashKey };
}

interface MuteIndicatorProps {
  muted: boolean;
  visible: boolean;
  flashKey: number;
}

export const MuteIndicator: React.FC<MuteIndicatorProps> = ({ muted, visible, flashKey }) => {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2">
      <div
        key={flashKey}
        role="status"
        aria-live="polite"
        aria-label={muted ? 'Muted' : 'Sound On'}
        data-mute-indicator={muted ? 'muted' : 'sound-on'}
        className={`anim-mute-flash flex h-9 items-center gap-1.5 rounded-xl border-2 px-2.5 shadow-xl ${
          muted
            ? 'border-rose-400 bg-slate-900/95 text-rose-300 shadow-[0_0_20px_rgba(251,113,133,0.65)]'
            : 'border-emerald-400 bg-slate-900/95 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.65)]'
        }`}
      >
      {muted ? (
        <>
          <VolumeX className="h-4 w-4 text-rose-400" />
          <svg viewBox="0 0 20 14" className="h-3.5 w-5" aria-hidden="true">
            <path d="M2 7h16" stroke="#fb7185" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3" />
          </svg>
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4 text-emerald-300" />
          <svg viewBox="0 0 18 14" className="h-3.5 w-4.5" aria-hidden="true">
            <rect x="1" y="5" width="3" height="8" rx="1.5" fill="#34d399" />
            <rect x="7" y="2" width="3" height="11" rx="1.5" fill="#6ee7b7" />
            <rect x="13" y="4" width="3" height="9" rx="1.5" fill="#38bdf8" />
          </svg>
        </>
      )}
      </div>
    </div>
  );
};
