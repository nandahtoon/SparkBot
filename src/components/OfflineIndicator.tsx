import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      data-testid="offline-indicator"
      role="status"
      aria-live="polite"
      className="fixed bottom-3 left-3 z-[70] safe-bottom safe-left pointer-events-none"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/95 text-slate-950 font-extrabold text-xs shadow-lg border border-amber-200/60">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <span>Offline Mode — Playable anywhere!</span>
      </div>
    </div>
  );
};
