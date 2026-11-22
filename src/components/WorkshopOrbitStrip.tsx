import React from 'react';
import { Focus, RefreshCw, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

export interface WorkshopCameraControls {
  autoSpin: boolean;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onToggleAutoSpin: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

interface WorkshopOrbitStripProps extends WorkshopCameraControls {
  accent?: 'sky' | 'fuchsia';
  autoSpinButtonId?: string;
}

/**
 * Shared responsive 3D orbit, 360° auto-spin, zoom, and camera reset toolbar
 * used by both BuildDock and PaintBoothDock across phone, tablet, and desktop.
 */
export const WorkshopOrbitStrip: React.FC<WorkshopOrbitStripProps> = ({
  autoSpin,
  accent = 'sky',
  autoSpinButtonId,
  onRotateLeft,
  onRotateRight,
  onToggleAutoSpin,
  onZoomIn,
  onZoomOut,
  onResetView
}) => {
  const activeSpinStyle =
    accent === 'fuchsia'
      ? 'border-fuchsia-300 bg-fuchsia-500/25 text-fuchsia-200 shadow-[0_0_12px_rgba(232,121,249,0.35)]'
      : 'border-sky-300 bg-sky-500/25 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.35)]';

  const hoverBorder = accent === 'fuchsia' ? 'hover:border-fuchsia-400' : 'hover:border-sky-400';

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onRotateLeft}
        aria-label="Rotate Robot Left"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-sky-300 transition-transform hover:border-sky-400 active:scale-95 sm:h-9 sm:w-9"
      >
        <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      <button
        id={autoSpinButtonId}
        type="button"
        aria-pressed={autoSpin}
        onClick={onToggleAutoSpin}
        aria-label="Toggle 360 Auto Spin"
        className={`flex h-8 shrink-0 items-center gap-1 rounded-xl border px-1.5 text-[11px] font-black transition-transform active:scale-95 sm:h-9 sm:px-2.5 sm:text-xs ${
          autoSpin
            ? activeSpinStyle
            : `border-slate-700 bg-slate-800 text-slate-200 ${hoverBorder}`
        }`}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${autoSpin ? 'animate-spin' : ''}`} />
        <span>360°</span>
      </button>
      <button
        type="button"
        onClick={onRotateRight}
        aria-label="Rotate Robot Right"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-sky-300 transition-transform hover:border-sky-400 active:scale-95 sm:h-9 sm:w-9"
      >
        <RotateCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>

      <div className="mx-0.5 hidden h-5 w-px bg-slate-700 sm:block" aria-hidden="true" />

      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Zoom Out"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition-transform hover:border-sky-400 active:scale-95 sm:h-9 sm:w-9"
      >
        <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Zoom In"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition-transform hover:border-sky-400 active:scale-95 sm:h-9 sm:w-9"
      >
        <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      <button
        type="button"
        onClick={onResetView}
        aria-label="Reset 3D View"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition-transform hover:border-sky-400 active:scale-95 sm:h-9 sm:w-9"
      >
        <Focus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
  );
};
