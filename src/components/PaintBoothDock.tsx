import React, { useMemo, useState } from 'react';
import {
  AlignJustify,
  Ban,
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  Grid2x2,
  Heart,
  Leaf,
  Paintbrush,
  Palette,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Zap
} from 'lucide-react';
import {
  BOT_CHARACTERS,
  DECAL_LABELS,
  DECAL_ORDER,
  PAINT_COLOR_SWATCHES,
  PAINT_PART_LABELS,
  PAINT_PART_ORDER,
  type BotCharacterId,
  type ChassisGrid,
  type DecalId,
  type PaintBoothConfig,
  type PaintPartKey,
  type PartId,
  type PartPaintSpec,
  type SavedPaintTheme
} from '../game/engine';
import { WorkshopOrbitStrip, type WorkshopCameraControls } from './WorkshopOrbitStrip';

interface PaintBoothDockProps {
  chassis: ChassisGrid;
  activeCharacter: BotCharacterId;
  paintConfig: PaintBoothConfig;
  selectedPart: PaintPartKey;
  savedThemes: SavedPaintTheme[];
  camera: WorkshopCameraControls;
  onSelectPart: (part: PaintPartKey) => void;
  onUpdatePartPaint: (part: PaintPartKey, patch: Partial<PartPaintSpec>, announce?: boolean) => void;
  onSaveTheme: (name: string) => void;
  onApplySavedTheme: (theme: SavedPaintTheme) => void;
  onDeleteSavedTheme: (id: string) => void;
  onResetPaint: () => void;
  onOpenProfile: () => void;
  onExit: () => void;
}

const DECAL_ICONS: Record<DecalId, React.ReactNode> = {
  none: <Ban className="h-3.5 w-3.5" />,
  stripes: <AlignJustify className="h-3.5 w-3.5" />,
  stars: <Star className="h-3.5 w-3.5" />,
  lightning: <Zap className="h-3.5 w-3.5" />,
  flames: <Flame className="h-3.5 w-3.5" />,
  leaf: <Leaf className="h-3.5 w-3.5" />,
  hearts: <Heart className="h-3.5 w-3.5" />,
  checker: <Grid2x2 className="h-3.5 w-3.5" />
};

const CORE_PARTS = new Set<PaintPartKey>(['chassis', 'head', 'arms']);

export const PaintBoothDock: React.FC<PaintBoothDockProps> = ({
  chassis,
  activeCharacter,
  paintConfig,
  selectedPart,
  savedThemes,
  camera,
  onSelectPart,
  onUpdatePartPaint,
  onSaveTheme,
  onApplySavedTheme,
  onDeleteSavedTheme,
  onResetPaint,
  onOpenProfile,
  onExit
}) => {
  const [themeName, setThemeName] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'color' | 'decal'>('color');

  const installedParts = useMemo(() => {
    const set = new Set<PartId>();
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const p = chassis[r]?.[c];
        if (p) set.add(p);
      }
    }
    return set;
  }, [chassis]);

  const activeSpec = paintConfig.parts[selectedPart];
  const activeChar = BOT_CHARACTERS[activeCharacter];

  function handleSaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = themeName.trim() || `${activeChar.name} Custom`;
    onSaveTheme(cleaned);
    setThemeName('');
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1400);
  }

  return (
    <div
      id="paintBoothDock"
      className="pointer-events-none safe-bottom fixed inset-x-0 bottom-0 z-20 flex flex-col items-center px-2 pb-1 sm:px-3 sm:pb-1.5"
    >
      <div className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-fuchsia-400/75 bg-slate-900/94 px-2.5 py-1.5 shadow-[0_12px_32px_rgba(192,38,211,0.24)] backdrop-blur-md sm:px-3.5 sm:py-2">
        {/* Row 1: Studio Header + Right Actions */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-sky-500 text-white shadow">
              <Paintbrush className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-black text-white sm:text-sm">Paint Booth</span>
                <span className="hidden rounded-md border border-fuchsia-400/50 bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-fuchsia-200 md:inline">
                  Tap 3D part or tab
                </span>
              </div>
            </div>
          </div>

          {/* 360° Model View Controls (inline on md+) */}
          <div className="hidden md:flex">
            <WorkshopOrbitStrip {...camera} accent="fuchsia" />
          </div>

          {/* Right Actions: Character, Reset Paint, Collapse, Done */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              id="boothProfileBtn"
              type="button"
              onClick={onOpenProfile}
              aria-label="Change Bot Character"
              className="flex h-8 items-center gap-1 rounded-xl border border-sky-400/70 bg-sky-500/15 px-2 text-[11px] font-black text-sky-200 hover:bg-sky-500/25 active:scale-95"
            >
              <UserRound className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{activeChar.name}</span>
            </button>
            <button
              id="resetPaintBtn"
              type="button"
              onClick={onResetPaint}
              aria-label="Reset Paint Theme"
              className="flex h-8 items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2 text-[11px] font-bold text-slate-300 hover:border-amber-400 hover:text-amber-200 active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expand Paint Controls' : 'Collapse Paint Controls'}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:border-fuchsia-400"
            >
              {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              id="exitPaintBoothBtn"
              type="button"
              onClick={onExit}
              aria-label="Exit Paint Booth"
              className="flex h-8 items-center gap-1 rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 px-2.5 text-xs font-black text-slate-950 shadow-[0_2px_0_#047857] active:translate-y-0.5 sm:px-3"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>Done</span>
            </button>
          </div>
        </div>

        {/* Compact swipeable 3D Orbit Strip on mobile/tablet (< md) */}
        <div className="no-scrollbar touch-pan-x mt-1.5 flex items-center justify-between gap-1.5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/75 px-1.5 py-1 md:hidden">
          <WorkshopOrbitStrip {...camera} accent="fuchsia" />
          {!collapsed && (
            <div className="flex shrink-0 items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => setMobilePanel('color')}
                className={`flex h-6.5 items-center gap-1 rounded-md px-2 text-[11px] font-black transition-colors ${
                  mobilePanel === 'color'
                    ? 'bg-fuchsia-500/30 text-fuchsia-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Palette className="h-3 w-3" />
                <span>Color</span>
              </button>
              <button
                type="button"
                onClick={() => setMobilePanel('decal')}
                className={`flex h-6.5 items-center gap-1 rounded-md px-2 text-[11px] font-black transition-colors ${
                  mobilePanel === 'decal'
                    ? 'bg-amber-400/25 text-amber-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>Decal</span>
              </button>
            </div>
          )}
        </div>

        {!collapsed && (
          <>
            {/* Row 2: Individual Robot Part Selector Tabs */}
            <div
              role="tablist"
              aria-label="Robot Paint Parts"
              className="no-scrollbar touch-pan-x mt-1.5 flex items-center gap-1 overflow-x-auto pb-0.5"
            >
              {PAINT_PART_ORDER.map((partKey) => {
                const spec = paintConfig.parts[partKey];
                const isSelected = selectedPart === partKey;
                const isEquipped =
                  CORE_PARTS.has(partKey) || installedParts.has(partKey as PartId);
                return (
                  <button
                    key={partKey}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    data-paint-part={partKey}
                    onClick={() => onSelectPart(partKey)}
                    className={`flex h-7.5 shrink-0 items-center gap-1 rounded-lg border px-2 text-[11px] font-black transition-all active:scale-95 ${
                      isSelected
                        ? 'border-fuchsia-300 bg-fuchsia-500/25 text-white shadow-[0_0_10px_rgba(232,121,249,0.35)]'
                        : isEquipped
                          ? 'border-slate-700 bg-slate-800/95 text-slate-200 hover:border-sky-400'
                          : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-white/60 shadow-inner"
                      style={{ backgroundColor: spec.color }}
                    />
                    <span>{PAINT_PART_LABELS[partKey]}</span>
                    {!isEquipped && (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-600" title="Install part to view on bot" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Row 3: Custom Color Swatches + Color Picker & Decal Selector */}
            <div className="mt-1.5 grid grid-cols-1 gap-1.5 rounded-xl border border-slate-800 bg-slate-950/75 p-2 md:grid-cols-12">
              {/* Left: Color Palette + Native Custom Color Picker */}
              <div className={`${mobilePanel === 'color' ? 'flex' : 'hidden'} flex-col gap-1 md:col-span-6 md:flex`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {PAINT_PART_LABELS[selectedPart]} Color
                  </span>
                  <label className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-200 hover:border-fuchsia-400">
                    <input
                      id="customColorPicker"
                      type="color"
                      aria-label="Custom Part Color"
                      value={activeSpec.color}
                      onChange={(e) => onUpdatePartPaint(selectedPart, { color: e.target.value }, false)}
                      className="h-3.5 w-4 cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="tabular font-mono text-[10px] uppercase text-sky-200">
                      {activeSpec.color}
                    </span>
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {PAINT_COLOR_SWATCHES.map((sw) => {
                    const active = activeSpec.color.toLowerCase() === sw.hex.toLowerCase();
                    return (
                      <button
                        key={sw.hex}
                        type="button"
                        data-swatch-hex={sw.hex}
                        aria-label={`Set ${PAINT_PART_LABELS[selectedPart]} color to ${sw.name}`}
                        aria-pressed={active}
                        onClick={() => onUpdatePartPaint(selectedPart, { color: sw.hex }, true)}
                        className={`flex h-6.5 w-6.5 items-center justify-center rounded-full border-2 transition-transform active:scale-90 sm:h-7 sm:w-7 ${
                          active
                            ? 'scale-110 border-white ring-2 ring-fuchsia-300/60'
                            : 'border-slate-900 opacity-90 hover:scale-105 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      >
                        {active && <Check className="h-3 w-3 stroke-[3] text-slate-950 drop-shadow" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Part Decals */}
              <div className={`${mobilePanel === 'decal' ? 'flex' : 'hidden'} flex-col gap-1 md:col-span-6 md:flex md:border-l md:border-slate-800 md:pl-2.5`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {PAINT_PART_LABELS[selectedPart]} Decal
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {DECAL_ORDER.map((decalId) => {
                    const active = activeSpec.decal === decalId;
                    return (
                      <button
                        key={decalId}
                        type="button"
                        data-decal={decalId}
                        aria-pressed={active}
                        aria-label={`Apply ${DECAL_LABELS[decalId]} decal`}
                        onClick={() => onUpdatePartPaint(selectedPart, { decal: decalId }, true)}
                        className={`flex h-7.5 items-center gap-1 rounded-lg border px-2 text-[11px] font-black transition-all active:scale-95 ${
                          active
                            ? 'border-amber-300 bg-amber-400/20 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-sky-400'
                        }`}
                      >
                        {DECAL_ICONS[decalId]}
                        <span>{DECAL_LABELS[decalId]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 4: Save Theme to Robot Profile + Saved Themes Tray */}
            <div className="mt-1.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <form onSubmit={handleSaveSubmit} className="flex shrink-0 items-center gap-1.5">
                <input
                  id="themeNameInput"
                  type="text"
                  maxLength={28}
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="Name paint theme..."
                  aria-label="Paint Theme Name"
                  className="h-8 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-xs font-bold text-white placeholder:text-slate-500 focus:border-fuchsia-400 focus:outline-none sm:w-40 sm:flex-none"
                />
                <button
                  id="saveThemeBtn"
                  type="submit"
                  className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-fuchsia-300/80 bg-fuchsia-500/25 px-2.5 text-[11px] font-black text-fuchsia-100 hover:bg-fuchsia-500/35 active:scale-95"
                >
                  {justSaved ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                  <span>{justSaved ? 'Saved!' : 'Save'}</span>
                </button>
              </form>

              {/* Saved Profile Themes List */}
              <div className="no-scrollbar touch-pan-x flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
                {savedThemes.length === 0 ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <Sparkles className="h-3 w-3 shrink-0" />
                    <span className="truncate">Save custom themes to your robot profile</span>
                  </span>
                ) : (
                  savedThemes.map((t) => (
                    <div
                      key={t.id}
                      className="flex shrink-0 items-center overflow-hidden rounded-lg border border-slate-700 bg-slate-800/95"
                    >
                      <button
                        type="button"
                        data-saved-theme={t.id}
                        onClick={() => onApplySavedTheme(t)}
                        className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-extrabold text-slate-100 hover:bg-slate-700/80 active:scale-95"
                      >
                        <span className="flex -space-x-1">
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-slate-950"
                            style={{ backgroundColor: t.config.parts.chassis.color }}
                          />
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-slate-950"
                            style={{ backgroundColor: t.config.parts.head.color }}
                          />
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-slate-950"
                            style={{ backgroundColor: t.config.parts.arms.color }}
                          />
                        </span>
                        <span className="max-w-[96px] truncate">{t.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSavedTheme(t.id)}
                        aria-label={`Delete theme ${t.name}`}
                        className="flex h-7 w-6 items-center justify-center border-l border-slate-700 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
