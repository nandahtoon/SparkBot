import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Lightbulb,
  Paintbrush,
  Palette,
  Smile,
  UserRound,
  X,
  Zap
} from 'lucide-react';
import {
  BOT_CHARACTERS,
  BOT_THEME_ORDER,
  BOT_THEMES,
  canPlacePartInSlot,
  computeChassisInfo,
  PARTS,
  type BotCharacterId,
  type BotThemeId,
  type ChassisGrid,
  type LevelDef,
  type PartId,
  type TutorialStep
} from '../game/engine';
import { computeBuildEquipmentGuide } from '../game/buildHints';
import { computePartBuildPlan } from '../game/partTooltips';
import type { SlotScreenPoint } from '../three/robotRig';
import {
  createPartPlacementBurst,
  type PlacementUiBurst
} from '../game/partParticles';
import { BuildPartTooltip } from './BuildPartTooltip';
import type { DemoTopic } from './ConceptDemoPopover';
import { PartIcon } from './Icons';
import { WorkshopOrbitStrip, type WorkshopCameraControls } from './WorkshopOrbitStrip';

interface BuildDockProps {
  level: LevelDef;
  chassis: ChassisGrid;
  budget: number;
  slotPoints: SlotScreenPoint[];
  selectedPart: PartId | null;
  botTheme: BotThemeId;
  activeCharacter: BotCharacterId;
  tutorialStep: TutorialStep | null;
  ghostHelp: boolean;
  camera: WorkshopCameraControls;
  inspectMode: boolean;
  lowGraphics?: boolean;
  installPhase?: 'idle' | 'working' | 'celebrating';
  lastPlacement?: { id: number; part: PartId; r: number; c: number } | null;
  hintBanner?: React.ReactNode;
  onSelectPart: (part: PartId | null) => void;
  onChangeBotTheme: (theme: BotThemeId) => void;
  onHoverSlot: (hover: { r: number; c: number; valid: boolean; part: PartId } | null) => void;
  onPlacePart: (part: PartId, r: number, c: number) => void;
  onRemoveSlot: (r: number, c: number) => void;
  onProceedToCode: () => void;
  onOpenPaintBooth: () => void;
  onOpenProfile: () => void;
  onToggleInspect: () => void;
  onTalkToBot: () => void;
  onOpenDemo?: (topic: DemoTopic) => void;
  onRequestHint?: () => void;
}

const SWATCH_BG: Record<BotThemeId, string> = {
  amber: 'bg-amber-400',
  cobalt: 'bg-sky-400',
  emerald: 'bg-emerald-400'
};

const PART_ORDER: PartId[] = ['wheels', 'treads', 'thrusters', 'booster', 'laser', 'magnet'];
const SNAP_RADIUS_PX = 80;

export const BuildDock: React.FC<BuildDockProps> = ({
  level,
  chassis,
  budget,
  slotPoints,
  selectedPart,
  botTheme,
  activeCharacter,
  tutorialStep,
  ghostHelp,
  camera,
  inspectMode,
  lowGraphics = false,
  installPhase = 'idle',
  lastPlacement = null,
  hintBanner = null,
  onSelectPart,
  onChangeBotTheme,
  onHoverSlot,
  onPlacePart,
  onRemoveSlot,
  onProceedToCode,
  onOpenPaintBooth,
  onOpenProfile,
  onToggleInspect,
  onTalkToBot,
  onOpenDemo,
  onRequestHint
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showGuide, setShowGuide] = useState(() => !level.isBonus && !level.isDaily && level.id <= 5);
  useEffect(() => {
    setShowGuide(!level.isBonus && !level.isDaily && level.id <= 5);
  }, [level.id, level.isBonus, level.isDaily]);
  const [hoveredPart, setHoveredPart] = useState<{
    part: PartId;
    anchorX: number;
    anchorTop: number;
  } | null>(null);
  const [dragState, setDragState] = useState<{
    part: PartId;
    x: number;
    y: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const dragRef = useRef(dragState);
  dragRef.current = dragState;
  const slotPointsRef = useRef(slotPoints);
  slotPointsRef.current = slotPoints;
  const burstTimersRef = useRef<number[]>([]);
  const [placementBursts, setPlacementBursts] = useState<PlacementUiBurst[]>([]);

  useEffect(() => {
    return () => {
      for (const t of burstTimersRef.current) window.clearTimeout(t);
      burstTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!lastPlacement) return;
    const matchedSlot = slotPointsRef.current.find(
      (sp) => sp.r === lastPlacement.r && sp.c === lastPlacement.c && sp.visible
    );
    const originX = matchedSlot ? matchedSlot.x : window.innerWidth * 0.5;
    const originY = matchedSlot ? matchedSlot.y : window.innerHeight * 0.44;
    const burst = createPartPlacementBurst(
      lastPlacement.part,
      originX,
      originY,
      lastPlacement.id,
      lowGraphics
    );
    setPlacementBursts((prev) => [...prev.slice(-4), burst]);
    const timer = window.setTimeout(() => {
      setPlacementBursts((prev) => prev.filter((b) => b.id !== burst.id));
      burstTimersRef.current = burstTimersRef.current.filter((id) => id !== timer);
    }, 950);
    burstTimersRef.current.push(timer);
  }, [lastPlacement, lowGraphics]);

  useEffect(() => {
    if (!hoveredPart) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setHoveredPart(null);
      }
    };
    const onResize = () => setHoveredPart(null);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onResize);
    };
  }, [hoveredPart]);

  useEffect(() => {
    if (collapsed || dragState?.moved) {
      setHoveredPart(null);
    }
  }, [collapsed, dragState?.moved]);

  function showPartTooltip(el: HTMLElement, part: PartId) {
    if (dragRef.current?.moved) return;
    const rect = el.getBoundingClientRect();
    setHoveredPart({
      part,
      anchorX: rect.left + rect.width / 2,
      anchorTop: rect.top
    });
  }

  const info = computeChassisInfo(chassis);
  const guide = computeBuildEquipmentGuide(level, chassis, selectedPart);
  const guideActive = showGuide || ghostHelp;
  const readyForCode = info.hasDrive && info.hasFrontLaser;
  const visibleSlots = slotPoints.filter((sp) => sp.visible);
  const activeTooltip =
    !collapsed && !dragState?.moved && hoveredPart
      ? {
          ...hoveredPart,
          plan: computePartBuildPlan(hoveredPart.part, chassis, level)
        }
      : null;

  function findNearestSlot(px: number, py: number): SlotScreenPoint | null {
    let best: SlotScreenPoint | null = null;
    let bestDist = SNAP_RADIUS_PX;
    for (const sp of visibleSlots) {
      const d = Math.hypot(px - sp.x, py - sp.y);
      if (d <= bestDist) {
        bestDist = d;
        best = sp;
      }
    }
    return best;
  }

  function handlePartPointerDown(e: React.PointerEvent, part: PartId) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const nextDrag = {
      part,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      moved: false
    };
    setDragState(nextDrag);
  }

  function handlePartPointerMove(e: React.PointerEvent) {
    const cur = dragRef.current;
    if (!cur) return;
    const dist = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
    const moved = cur.moved || dist > 8;
    setDragState({ ...cur, x: e.clientX, y: e.clientY, moved });

    if (moved) {
      const nearest = findNearestSlot(e.clientX, e.clientY);
      if (nearest) {
        const check = canPlacePartInSlot(chassis, budget, cur.part, nearest.r, nearest.c);
        onHoverSlot({ r: nearest.r, c: nearest.c, valid: check.ok, part: cur.part });
      } else {
        onHoverSlot(null);
      }
    }
  }

  function handlePartPointerUp(e: React.PointerEvent) {
    const cur = dragRef.current;
    if (!cur) return;
    setDragState(null);
    onHoverSlot(null);

    if (cur.moved) {
      const nearest = findNearestSlot(e.clientX, e.clientY);
      if (nearest) {
        onPlacePart(cur.part, nearest.r, nearest.c);
        return;
      }
    }
    // Tap fallback: toggle selection OR auto-place on preferred slot on second tap
    if (selectedPart === cur.part) {
      const pref = PARTS[cur.part].preferredSlot;
      onPlacePart(cur.part, pref[0], pref[1]);
      onSelectPart(null);
    } else {
      onSelectPart(cur.part);
    }
  }

  const activeHovered =
    dragState && dragState.moved ? findNearestSlot(dragState.x, dragState.y) : null;

  return (
    <>
      {/* Projected 3D Chassis Snap Pads over the 3D Robot (hidden during 3D Inspect or active mechanic welding unless dragging) */}
      {((!inspectMode && installPhase !== 'working') || Boolean(dragState?.moved) || Boolean(selectedPart)) && (
        <div
          className={`pointer-events-none fixed inset-0 z-10 overflow-hidden transition-opacity duration-200 ${
            installPhase === 'celebrating' && !dragState?.moved && !selectedPart ? 'opacity-30' : 'opacity-100'
          }`}
        >
          {visibleSlots.map((sp) => {
          const key = `${sp.r},${sp.c}`;
          const isGuideTargetSlot =
            guideActive &&
            Boolean(guide.nextStep) &&
            guide.nextStep!.slotKey === key &&
            (!selectedPart || selectedPart === guide.nextStep!.part);
          const isTarget =
            (ghostHelp &&
              tutorialStep?.targetType === 'slot' &&
              tutorialStep.targetKey === key) ||
            isGuideTargetSlot;
          const isHovered = activeHovered?.r === sp.r && activeHovered?.c === sp.c;
          const check =
            dragState?.part
              ? canPlacePartInSlot(chassis, budget, dragState.part, sp.r, sp.c)
              : selectedPart
                ? canPlacePartInSlot(chassis, budget, selectedPart, sp.r, sp.c)
                : { ok: true };
          const ringStyle = isHovered
            ? check.ok
              ? 'border-emerald-300 bg-emerald-400/35 scale-120 shadow-[0_0_22px_rgba(52,211,153,0.7)]'
              : 'border-rose-400 bg-rose-500/35 scale-110'
            : isTarget
              ? 'border-amber-300 bg-amber-400/25 scale-110 shadow-[0_0_20px_rgba(251,191,36,0.72)] ring-2 ring-amber-300/60'
              : sp.part
                ? 'border-sky-400/85 bg-slate-900/75'
                : selectedPart && check.ok
                  ? 'border-emerald-400/80 bg-emerald-500/15'
                  : 'border-slate-300/35 bg-slate-900/30';

          return (
            <button
              key={key}
              type="button"
              data-slot={key}
              data-guide-target={isGuideTargetSlot ? 'true' : 'false'}
              aria-label={`Chassis Slot ${sp.r},${sp.c}${sp.part ? ` with ${sp.part}` : ''}${isGuideTargetSlot && guide.nextStep ? ` — Recommended for ${guide.nextStep.name}` : ''}`}
              onClick={() => {
                if (selectedPart) {
                  onPlacePart(selectedPart, sp.r, sp.c);
                  onSelectPart(null);
                } else if (isGuideTargetSlot && guide.nextStep && !sp.part) {
                  onPlacePart(guide.nextStep.part, sp.r, sp.c);
                } else if (sp.part) {
                  onRemoveSlot(sp.r, sp.c);
                }
              }}
              style={{
                left: `${sp.x}px`,
                top: `${sp.y}px`,
                transform: 'translate(-50%, -50%)'
              }}
              className={`pointer-events-auto absolute flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-150 sm:h-11 sm:w-11 ${ringStyle}`}
            >
              {isGuideTargetSlot && guide.nextStep && !sp.part && (
                <span className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-lg border border-amber-300 bg-slate-950/95 px-2 py-0.5 text-[10px] font-black text-amber-200 shadow-lg">
                  Attach Here
                </span>
              )}
              {sp.part ? (
                <div className="relative flex items-center justify-center">
                  <PartIcon id={sp.part} className="h-6 w-6 sm:h-7 sm:w-7" />
                  {!selectedPart && (
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow">
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </div>
              ) : (
                <span className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${isGuideTargetSlot ? 'bg-amber-300' : 'bg-sky-300/75'}`} />
              )}
            </button>
          );
        })}
        </div>
      )}

      {/* Subtle Cute Color-Coded Sparkle & Puff Bursts on Successful Part Placement */}
      {placementBursts.length > 0 && (
        <div
          data-testid="part-placement-particles"
          data-low-graphics={lowGraphics ? 'true' : 'false'}
          className="pointer-events-none fixed inset-0 z-20 overflow-hidden"
          aria-hidden="true"
        >
          {placementBursts.map((burst) => (
            <div
              key={burst.id}
              data-part-burst={burst.part}
              className="absolute"
              style={{ left: `${burst.x}px`, top: `${burst.y}px` }}
            >
              {/* Soft expanding color-coded snap halo */}
              <span
                className="anim-part-halo absolute left-0 top-0 block h-14 w-14 rounded-full border-2"
                style={{
                  borderColor: burst.palette.primaryCss,
                  boxShadow: `0 0 18px ${burst.palette.ringGlow}`
                }}
              />
              {burst.particles.map((pt) => {
                const vars = {
                  '--dx': `${pt.dx}px`,
                  '--dy': `${pt.dy}px`,
                  '--rot': `${pt.rotationDeg}deg`,
                  animationDelay: `${pt.delayMs}ms`,
                  animationDuration: `${pt.durationMs}ms`
                } as React.CSSProperties;

                if (pt.kind === 'puff') {
                  return (
                    <span
                      key={pt.id}
                      data-particle-kind="puff"
                      className="anim-part-puff absolute left-0 top-0 block rounded-full"
                      style={{
                        ...vars,
                        width: `${pt.size}px`,
                        height: `${pt.size}px`,
                        backgroundColor: pt.color,
                        boxShadow: `0 0 10px ${burst.palette.ringGlow}`
                      }}
                    />
                  );
                }

                if (pt.kind === 'dot') {
                  return (
                    <span
                      key={pt.id}
                      data-particle-kind="dot"
                      className="anim-part-sparkle absolute left-0 top-0 block rounded-full"
                      style={{
                        ...vars,
                        width: `${pt.size}px`,
                        height: `${pt.size}px`,
                        backgroundColor: pt.color,
                        boxShadow: `0 0 8px ${burst.palette.ringGlow}`
                      }}
                    />
                  );
                }

                return (
                  <svg
                    key={pt.id}
                    data-particle-kind="sparkle"
                    viewBox="0 0 24 24"
                    className="anim-part-sparkle absolute left-0 top-0"
                    style={{
                      ...vars,
                      width: `${pt.size}px`,
                      height: `${pt.size}px`,
                      filter: `drop-shadow(0 0 5px ${burst.palette.ringGlow})`
                    }}
                  >
                    <path
                      d="M12 1.5 L14.6 9.4 L22.5 12 L14.6 14.6 L12 22.5 L9.4 14.6 L1.5 12 L9.4 9.4 Z"
                      fill={pt.color}
                    />
                  </svg>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Floating Drag Proxy */}
      {dragState && dragState.moved && (
        <div
          style={{
            left: `${dragState.x}px`,
            top: `${dragState.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
          className="pointer-events-none fixed z-50 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-300 bg-slate-900/95 shadow-2xl"
        >
          <PartIcon id={dragState.part} className="h-11 w-11" />
        </div>
      )}

      {/* Informative Part Hover / Focus Tooltip (viewport-clamped above dock) */}
      {activeTooltip && (
        <BuildPartTooltip
          plan={activeTooltip.plan}
          anchorX={activeTooltip.anchorX}
          anchorTop={activeTooltip.anchorTop}
        />
      )}

      {/* Collapsible Bottom 3D Workshop Part Dock */}
      <div className="pointer-events-none safe-bottom fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-2 sm:px-3">
        {hintBanner}
        <div className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-slate-600/80 bg-slate-900/95 px-2.5 py-1.5 shadow-2xl sm:rounded-3xl sm:border-2 sm:border-slate-700 sm:px-3.5 sm:py-2">
          {/* Top Dock Bar: Energy Meter + Live Hover Preview + Bot Painter + Collapse + Next Button */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2.5">
            <div className="flex shrink-0 items-center gap-2 sm:min-w-0 sm:flex-1">
              <div
                data-testid="dock-energy-meter"
                className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-800 px-2 py-1 text-amber-300 sm:px-2.5 sm:py-1"
              >
                <Zap className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="tabular text-sm font-black sm:text-base">
                  {info.cost}/{budget}
                </span>
                {activeTooltip && activeTooltip.plan.netEnergyDelta !== 0 && (
                  <span
                    data-testid="dock-energy-preview-delta"
                    className={`tabular ml-0.5 rounded-md px-1 py-0.5 text-[10px] font-black leading-none ${
                      !activeTooltip.plan.canAfford
                        ? 'bg-rose-500/25 text-rose-300'
                        : activeTooltip.plan.netEnergyDelta < 0
                          ? 'bg-emerald-500/25 text-emerald-300'
                          : 'bg-sky-500/25 text-sky-200'
                    }`}
                  >
                    {activeTooltip.plan.netEnergyDelta > 0
                      ? `+${activeTooltip.plan.netEnergyDelta}`
                      : activeTooltip.plan.netEnergyDelta}
                  </span>
                )}
              </div>
              <div className="relative hidden h-3 flex-1 overflow-hidden rounded-full bg-slate-800 sm:block">
                {activeTooltip && activeTooltip.plan.projectedEnergy > info.cost && (
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-200 ${
                      !activeTooltip.plan.canAfford
                        ? 'bg-rose-500/60'
                        : activeTooltip.plan.withinParBudget
                          ? 'bg-emerald-400/50'
                          : 'bg-amber-400/55'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((activeTooltip.plan.projectedEnergy / Math.max(1, budget)) * 100))}%`
                    }}
                  />
                )}
                <div
                  className={`relative h-full rounded-full transition-all duration-300 ${
                    info.cost > budget
                      ? 'bg-rose-500'
                      : info.cost > budget * 0.85
                        ? 'bg-amber-400'
                        : 'bg-sky-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.round((info.cost / Math.max(1, budget)) * 100))}%` }}
                />
              </div>
            </div>

            <div
              id="botPainterBar"
              role="group"
              aria-label="Bot Painter"
              className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-700 bg-slate-800/95 px-1.5 py-1 sm:gap-1.5 sm:px-2"
            >
              <Palette className="h-3.5 w-3.5 shrink-0 text-slate-300 sm:h-4 sm:w-4" aria-hidden="true" />
              {BOT_THEME_ORDER.map((themeId) => {
                const theme = BOT_THEMES[themeId];
                const active = botTheme === themeId;
                return (
                  <button
                    key={themeId}
                    type="button"
                    data-bot-theme={themeId}
                    data-active={active ? 'true' : 'false'}
                    aria-pressed={active}
                    aria-label={`Paint Robot ${theme.label}`}
                    onClick={() => onChangeBotTheme(themeId)}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-transform active:scale-90 sm:h-8 sm:w-8 ${SWATCH_BG[themeId]} ${
                      active
                        ? 'scale-105 border-white ring-2 ring-white/50 shadow-md'
                        : 'border-slate-950/70 opacity-85 hover:opacity-100'
                    }`}
                  >
                    {active && <Check className="h-3.5 w-3.5 stroke-[3] text-slate-950" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expand Dock' : 'Collapse Dock'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:border-sky-400"
            >
              {collapsed ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>

            <button
              id="toCodeBtn"
              type="button"
              onClick={onProceedToCode}
              disabled={!readyForCode}
              aria-label="Proceed to 3D Coding"
              className={`flex h-10 min-w-[54px] shrink-0 items-center justify-center rounded-2xl border-2 px-2.5 shadow-lg transition-transform active:scale-95 sm:h-11 sm:min-w-[72px] sm:px-3.5 ${
                readyForCode
                  ? 'border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 shadow-[0_4px_0_#047857]'
                  : 'border-slate-700 bg-slate-800 text-slate-500 opacity-50'
              }`}
            >
              <ArrowRight className="h-6 w-6 stroke-[3]" />
            </button>
          </div>

          {/* Integrated 3D Model View & Bot Interaction Strip (single-row swipeable on narrow phones) */}
          <div
            id="workshopViewBar"
            role="group"
            aria-label="3D Model View Controls"
            className="no-scrollbar touch-pan-x mt-1.5 flex flex-nowrap items-center justify-between gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 px-1.5 py-1"
          >
            <WorkshopOrbitStrip {...camera} autoSpinButtonId="autoSpinBtn" />

            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <button
                id="openPaintBoothBtn"
                type="button"
                onClick={onOpenPaintBooth}
                aria-label="Open Paint Booth"
                className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-fuchsia-400/80 bg-fuchsia-500/20 px-2 text-[11px] font-black text-fuchsia-200 transition-transform hover:bg-fuchsia-500/30 active:scale-95 sm:px-2.5 sm:text-xs"
              >
                <Paintbrush className="h-3.5 w-3.5" />
                <span>Paint Booth</span>
              </button>

              <button
                id="workshopProfileBtn"
                type="button"
                onClick={onOpenProfile}
                aria-label="Change Bot Character"
                className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-sky-400/70 bg-sky-500/15 px-2 text-[11px] font-black text-sky-200 transition-transform hover:bg-sky-500/25 active:scale-95 sm:px-2.5 sm:text-xs"
              >
                <UserRound className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{BOT_CHARACTERS[activeCharacter].name}</span>
              </button>

              <button
                id="inspect3DBtn"
                type="button"
                aria-pressed={inspectMode}
                onClick={onToggleInspect}
                aria-label="Toggle 3D Inspect View"
                className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-2 text-[11px] font-black transition-transform active:scale-95 sm:px-2.5 sm:text-xs ${
                  inspectMode
                    ? 'border-amber-300 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-300'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{inspectMode ? 'Inspecting' : '3D View'}</span>
              </button>

              <button
                id="toggleBuildGuideBtn"
                type="button"
                aria-pressed={showGuide}
                onClick={() => {
                  setShowGuide((v) => !v);
                  onRequestHint?.();
                }}
                aria-label={showGuide ? 'Hide Equipment Hint' : 'Show Equipment Hint'}
                className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-2 text-[11px] font-black transition-transform active:scale-95 sm:px-2.5 sm:text-xs ${
                  showGuide
                    ? 'border-amber-300 bg-amber-400/20 text-amber-200'
                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-300'
                }`}
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span>Hint</span>
              </button>

              <button
                id="talkToBotBtn"
                type="button"
                onClick={onTalkToBot}
                aria-label="Say Hi to Robot"
                className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-pink-400/70 bg-pink-500/20 px-2 text-[11px] font-black text-pink-200 transition-transform hover:bg-pink-500/30 active:scale-95 sm:px-2.5 sm:text-xs"
              >
                <Smile className="h-3.5 w-3.5" />
                <span>Say Hi</span>
              </button>
            </div>
          </div>

          {/* Kid-Friendly Step-by-Step Equipment Attachment Hint Bar */}
          {!collapsed && guideActive && (
            <div
              data-testid="build-equipment-hint"
              data-next-part={guide.nextStep?.part || 'ready'}
              className={`mt-1.5 flex flex-col gap-1.5 rounded-2xl border px-2.5 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3 ${
                guide.allRecommendedEquipped
                  ? 'border-emerald-400/60 bg-emerald-950/35'
                  : 'border-amber-400/50 bg-slate-950/85'
              }`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
                <Lightbulb
                  className={`mt-0.5 h-4 w-4 shrink-0 sm:mt-0 ${
                    guide.allRecommendedEquipped ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-xs font-black text-white">
                    {guide.headline}
                  </div>
                  <div className="truncate text-[11px] font-medium text-slate-300">
                    {guide.actionHint}
                  </div>
                </div>
              </div>

              <div className="no-scrollbar touch-pan-x flex max-w-full shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto">
                {guide.steps.map((step) => (
                  <button
                    key={step.part}
                    type="button"
                    disabled={step.installed}
                    data-hint-step={step.part}
                    aria-label={
                      step.installed
                        ? `${step.name} Attached`
                        : `Attach ${step.name} to ${step.slotLabel}`
                    }
                    onClick={() => {
                      if (!step.installed) {
                        onPlacePart(step.part, step.targetSlot[0], step.targetSlot[1]);
                        onSelectPart(null);
                      }
                    }}
                    className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 text-[11px] font-bold transition-transform active:scale-95 ${
                      step.installed
                        ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                        : step.isNext
                          ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-sm hover:bg-amber-300'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-sky-400'
                    }`}
                  >
                    {step.installed ? (
                      <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
                    ) : (
                      <PartIcon id={step.part} className="h-4 w-4" />
                    )}
                    <span>{step.installed ? step.name : `Attach ${step.name}`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Draggable / Tappable Oversized Part Cards */}
          {!collapsed && (
            <div
              onScroll={() => {
                if (hoveredPart) setHoveredPart(null);
              }}
              className="no-scrollbar touch-pan-x mt-1 flex items-center justify-start gap-2 overflow-x-auto pt-3 pb-0.5 sm:justify-center sm:gap-2.5"
            >
              {PART_ORDER.map((pid) => {
                const def = PARTS[pid];
                const isSelected = selectedPart === pid;
                const isGuideNext = guideActive && guide.nextStep?.part === pid;
                const isHint =
                  (ghostHelp &&
                    tutorialStep?.targetType === 'part' &&
                    tutorialStep.targetKey === pid) ||
                  isGuideNext;

                return (
                  <div
                    key={pid}
                    className="relative shrink-0"
                    onMouseEnter={(e) => showPartTooltip(e.currentTarget, pid)}
                    onMouseLeave={() =>
                      setHoveredPart((prev) => (prev?.part === pid ? null : prev))
                    }
                  >
                    <button
                      type="button"
                      data-part={pid}
                      aria-label={`${def.name} (${def.cost})`}
                      aria-describedby={
                        activeTooltip?.part === pid ? `part-tooltip-${pid}` : undefined
                      }
                      onFocus={(e) => showPartTooltip(e.currentTarget, pid)}
                      onBlur={() =>
                        setHoveredPart((prev) => (prev?.part === pid ? null : prev))
                      }
                      onPointerDown={(e) => handlePartPointerDown(e, pid)}
                      onPointerMove={handlePartPointerMove}
                      onPointerUp={handlePartPointerUp}
                      className={`relative flex h-15 w-15 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 transition-transform active:scale-95 sm:h-[68px] sm:w-[68px] sm:gap-1 ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-500/20 scale-105 shadow-[0_0_16px_rgba(52,211,153,0.45)]'
                          : isHint
                            ? 'border-amber-300 bg-amber-400/20 shadow-[0_0_18px_rgba(251,191,36,0.55)]'
                            : 'border-slate-700 bg-slate-800/95 hover:border-sky-400'
                      }`}
                    >
                      {isGuideNext && !isSelected && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-amber-200 bg-amber-400 px-1.5 py-0.5 text-[9px] font-black leading-none text-slate-950 shadow">
                          Next
                        </span>
                      )}
                      <PartIcon id={pid} className="h-7 w-7 sm:h-9 sm:w-9" />
                      <span className="tabular rounded-lg bg-slate-950/75 px-1.5 py-0.5 text-[11px] font-extrabold text-amber-300">
                        {def.cost}
                      </span>
                    </button>
                    {onOpenDemo && (
                      <button
                        type="button"
                        data-demo-part={pid}
                        aria-label={`${def.name} Visual Demo`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setHoveredPart(null);
                          onOpenDemo(pid);
                        }}
                        className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-sky-400/80 bg-slate-900 text-sky-300 shadow hover:bg-sky-500 hover:text-slate-950 active:scale-90"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
