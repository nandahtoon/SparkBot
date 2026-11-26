import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  Check,
  Copy,
  Cpu,
  Flame,
  FolderOpen,
  Gem,
  Grid2x2,
  Hammer,
  Minus,
  Play,
  Plus,
  RotateCw,
  Save,
  Share2,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import {
  cloneCircuitGrid,
  traceCircuit,
  type CircuitCellType,
  type SandboxMissionDraft,
  type TileType
} from '../game/engine';
import {
  createDefaultSandboxDraft,
  encodeChallengeCode,
  normalizeSandboxDraft,
  SANDBOX_MAX_BUDGET,
  SANDBOX_MAX_NAME_LEN,
  SANDBOX_MAX_SAVED,
  SANDBOX_MAX_TILES,
  SANDBOX_MIN_BUDGET,
  SANDBOX_MIN_TILES,
  SANDBOX_PRESETS,
  scrambleCircuitToUnsolved,
  validateSandboxDraft
} from '../game/sandboxCodec';
import { HazardIcon } from './Icons';

interface SandboxCreatorModalProps {
  visible: boolean;
  initialDraft: SandboxMissionDraft;
  savedLevels: SandboxMissionDraft[];
  onSaveDraft: (draft: SandboxMissionDraft, addToSavedSlot?: boolean) => void;
  onDeleteSavedLevel: (id: string) => void;
  onTestMission: (draft: SandboxMissionDraft) => void;
  onClose: () => void;
}

type TrackBrush = 'normal' | 'gap' | 'mud' | 'ramp' | 'crystal';
type CircuitBrush = CircuitCellType | 'rotate';

const TRACK_BRUSH_META: Array<{ id: TrackBrush; label: string; color: string }> = [
  { id: 'normal', label: 'Road', color: 'border-slate-500 bg-slate-800 text-slate-100' },
  { id: 'gap', label: 'Gap', color: 'border-rose-400/70 bg-rose-500/20 text-rose-200' },
  { id: 'mud', label: 'Mud', color: 'border-amber-500/70 bg-amber-900/40 text-amber-200' },
  { id: 'ramp', label: 'Ramp', color: 'border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-200' },
  { id: 'crystal', label: 'Crystal', color: 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200' }
];

const CIRCUIT_BRUSH_META: Array<{ id: CircuitBrush; label: string; tone: string }> = [
  { id: 'mirror', label: 'Mirror', tone: 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200' },
  { id: 'splitter', label: 'Splitter', tone: 'border-violet-400/70 bg-violet-500/20 text-violet-200' },
  { id: 'core', label: 'Core', tone: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200' },
  { id: 'wall', label: 'Wall', tone: 'border-slate-500 bg-slate-700/60 text-slate-200' },
  { id: 'rotate', label: 'Rotate', tone: 'border-amber-400/70 bg-amber-500/20 text-amber-200' },
  { id: 'empty', label: 'Erase', tone: 'border-rose-400/60 bg-rose-500/15 text-rose-200' }
];

export const SandboxCreatorModal: React.FC<SandboxCreatorModalProps> = ({
  visible,
  initialDraft,
  savedLevels,
  onSaveDraft,
  onDeleteSavedLevel,
  onTestMission,
  onClose
}) => {
  const [draft, setDraft] = useState<SandboxMissionDraft>(() => normalizeSandboxDraft(initialDraft));
  const [editorTab, setEditorTab] = useState<'track' | 'circuit' | 'saved'>('track');
  const [trackBrush, setTrackBrush] = useState<TrackBrush>('normal');
  const [circuitBrush, setCircuitBrush] = useState<CircuitBrush>('mirror');
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(normalizeSandboxDraft(initialDraft));
      setCopiedCode(false);
      setSavedToast(false);
    }
  }, [visible, initialDraft]);

  const validation = useMemo(() => validateSandboxDraft(draft), [draft]);
  const circuitTrace = useMemo(() => traceCircuit(draft.circuit), [draft.circuit]);
  const shareCode = useMemo(() => encodeChallengeCode(draft), [draft]);

  if (!visible) return null;

  const updateDraft = (updater: (cur: SandboxMissionDraft) => SandboxMissionDraft) => {
    setDraft((cur) => normalizeSandboxDraft(updater(cur)));
    setCopiedCode(false);
  };

  const handleTileClick = (idx: number) => {
    if (idx <= 0 || idx >= draft.track.length - 1) return;
    updateDraft((cur) => {
      const nextTrack = cur.track.map((t) => ({ ...t }));
      const target = nextTrack[idx];
      if (trackBrush === 'crystal') {
        if (target.type !== 'gap') {
          target.crystal = !target.crystal;
        }
      } else {
        target.type = trackBrush as TileType;
        if (trackBrush === 'gap') target.crystal = false;
      }
      return { ...cur, track: nextTrack, updatedAt: Date.now() };
    });
  };

  const handleTrackLengthDelta = (delta: -1 | 1) => {
    updateDraft((cur) => {
      const nextLen = cur.track.length + delta;
      if (nextLen < SANDBOX_MIN_TILES || nextLen > SANDBOX_MAX_TILES) return cur;
      const nextTrack = cur.track.map((t) => ({ ...t }));
      if (delta > 0) {
        nextTrack.splice(nextTrack.length - 1, 0, { type: 'normal', crystal: false });
      } else {
        nextTrack.splice(nextTrack.length - 2, 1);
      }
      return { ...cur, track: nextTrack, updatedAt: Date.now() };
    });
  };

  const handleCircuitCellClick = (r: number, c: number) => {
    updateDraft((cur) => {
      const nextGrid = cloneCircuitGrid(cur.circuit);
      const cell = nextGrid[r][c];
      if (circuitBrush === 'rotate') {
        if (cell.type === 'mirror' || cell.type === 'splitter') {
          cell.rot = cell.rot === 0 ? 1 : 0;
        }
      } else if (cell.type === circuitBrush) {
        if (cell.type === 'mirror' || cell.type === 'splitter') {
          cell.rot = cell.rot === 0 ? 1 : 0;
        } else {
          nextGrid[r][c] = { type: 'empty', rot: 0 };
        }
      } else {
        nextGrid[r][c] = { type: circuitBrush, rot: 0 };
      }
      return { ...cur, circuit: nextGrid, updatedAt: Date.now() };
    });
  };

  const handleCopyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(false);
    }
  };

  const handleAutoApplyPar = () => {
    updateDraft((cur) => ({
      ...cur,
      parBudget: Math.min(cur.budget, validation.recommendedParBudget),
      parBlocks: validation.recommendedParBlocks,
      updatedAt: Date.now()
    }));
  };

  const handleScrambleMirror = () => {
    const scrambled = scrambleCircuitToUnsolved(draft.circuit);
    if (!scrambled) return;
    updateDraft((cur) => ({
      ...cur,
      circuit: scrambled,
      updatedAt: Date.now()
    }));
  };

  const handleSaveSlot = () => {
    const toSave: SandboxMissionDraft = {
      ...draft,
      id:
        draft.id && draft.id !== 'draft_active' && !draft.id.startsWith('preset_')
          ? draft.id
          : `sb_${Date.now().toString(36)}`,
      updatedAt: Date.now()
    };
    setDraft(toSave);
    onSaveDraft(toSave, true);
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 1800);
  };

  return (
    <div
      id="sandboxCreatorModal"
      role="dialog"
      aria-modal="true"
      aria-label="Sandbox Level Creator"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2.5 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border-2 border-amber-400/75 bg-slate-900 text-slate-100 shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 bg-slate-950/80 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/70 bg-amber-400/20 text-amber-300">
              <Hammer className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-white sm:text-lg">
                Sandbox Level Studio
              </h2>
              <p className="text-[11px] font-medium text-slate-400">
                Design track hazards, place crystals, wire laser optics & share codes offline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="sandboxResetDefaultBtn"
              type="button"
              onClick={() => setDraft(createDefaultSandboxDraft())}
              className="flex h-10 items-center whitespace-nowrap rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:border-sky-400 active:scale-95"
            >
              Reset
            </button>
            <button
              id="closeSandboxModalBtn"
              type="button"
              onClick={onClose}
              aria-label="Close Sandbox Creator"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-300 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Two-Zone Workbench Body */}
        <div className="touch-pan-y grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-12 sm:p-5">
          {/* LEFT ZONE (~60% -> 7 cols): Interactive Track & Laser Optics Canvases + Live Validator */}
          <div className="flex flex-col gap-3.5 lg:col-span-7">
            {/* Track Canvas */}
            <section
              aria-label="Track Strip Designer"
              className="flex flex-col gap-2.5 rounded-2xl border-2 border-slate-700/80 bg-slate-950/75 p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Grid2x2 className="h-4 w-4 text-sky-300" aria-hidden="true" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    1. Robot Track ({draft.track.length} Tiles)
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    id="sandboxRemoveTileBtn"
                    type="button"
                    disabled={draft.track.length <= SANDBOX_MIN_TILES}
                    onClick={() => handleTrackLengthDelta(-1)}
                    aria-label="Remove track tile"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:border-sky-400 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    id="sandboxAddTileBtn"
                    type="button"
                    disabled={draft.track.length >= SANDBOX_MAX_TILES}
                    onClick={() => handleTrackLengthDelta(1)}
                    aria-label="Add track tile"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:border-sky-400 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {draft.track.map((tile, idx) => {
                  const isEndpoint = idx === 0 || idx === draft.track.length - 1;
                  const tileStyle =
                    tile.type === 'start'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : tile.type === 'gate'
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                        : tile.type === 'gap'
                          ? 'border-rose-400/80 bg-rose-950/60 text-rose-200'
                          : tile.type === 'mud'
                            ? 'border-amber-500/80 bg-amber-950/60 text-amber-200'
                            : tile.type === 'ramp'
                              ? 'border-fuchsia-400/80 bg-fuchsia-950/60 text-fuchsia-200'
                              : 'border-slate-600 bg-slate-800 text-slate-200';

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isEndpoint}
                      data-sandbox-tile={idx}
                      onClick={() => {
                        setEditorTab('track');
                        handleTileClick(idx);
                      }}
                      aria-label={`Tile ${idx}: ${tile.type}${tile.crystal ? ' with crystal' : ''}`}
                      className={`relative flex h-16 min-w-[54px] flex-col items-center justify-center gap-1 rounded-xl border-2 px-1.5 text-[10px] font-black uppercase transition-transform active:scale-95 ${tileStyle} ${
                        isEndpoint ? 'cursor-default opacity-95' : 'hover:brightness-110'
                      }`}
                    >
                      <span className="tabular text-[9px] text-slate-400">#{idx}</span>
                      {tile.type === 'gap' || tile.type === 'mud' || tile.type === 'ramp' ? (
                        <HazardIcon
                          cond={tile.type.toUpperCase() as 'GAP' | 'MUD' | 'RAMP'}
                          className="h-5 w-5"
                        />
                      ) : (
                        <span>{tile.type === 'start' ? 'START' : tile.type === 'gate' ? 'GATE' : 'ROAD'}</span>
                      )}
                      {tile.crystal && (
                        <Gem className="h-3.5 w-3.5 fill-cyan-300 text-cyan-200" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 5x5 Circuit Optics Canvas */}
            <section
              aria-label="5x5 Laser Optics Designer"
              className="flex flex-col gap-2.5 rounded-2xl border-2 border-slate-700/80 bg-slate-950/75 p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    2. 5×5 Laser Circuit (Beam enters Row 3 Left)
                  </h3>
                </div>
                <span
                  className={`tabular text-xs font-black ${
                    circuitTrace.solved ? 'text-amber-300' : 'text-cyan-300'
                  }`}
                >
                  {circuitTrace.litCount}/{circuitTrace.totalCores} Cores Lit
                </span>
              </div>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
                <div className="relative h-56 w-56 shrink-0 rounded-2xl border-2 border-slate-700 bg-slate-900 p-2">
                  <div className="grid h-full w-full grid-cols-5 grid-rows-5 gap-1">
                    {draft.circuit.map((row, r) =>
                      row.map((cell, c) => {
                        const isLit = Boolean(circuitTrace.litCores[`${r},${c}`]);
                        return (
                          <button
                            key={`${r}-${c}`}
                            type="button"
                            data-sandbox-cell={`${r},${c}`}
                            onClick={() => {
                              setEditorTab('circuit');
                              handleCircuitCellClick(r, c);
                            }}
                            aria-label={`Circuit row ${r + 1} col ${c + 1}: ${cell.type}`}
                            className={`relative flex items-center justify-center rounded-lg border text-[10px] font-black transition-colors ${
                              cell.type === 'core'
                                ? isLit
                                  ? 'border-emerald-300 bg-emerald-500/35 text-emerald-100'
                                  : 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300'
                                : cell.type === 'mirror'
                                  ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200'
                                  : cell.type === 'splitter'
                                    ? 'border-violet-400/70 bg-violet-500/20 text-violet-200'
                                    : cell.type === 'wall'
                                      ? 'border-slate-500 bg-slate-700 text-slate-200'
                                      : 'border-slate-800 bg-slate-950/70 text-slate-600 hover:border-slate-600'
                            }`}
                          >
                            {r === 2 && c === 0 && cell.type === 'empty' && (
                              <span className="text-[9px] text-cyan-400">➔</span>
                            )}
                            {cell.type === 'mirror' && (
                              <span className="text-sm font-black">{cell.rot === 0 ? '／' : '＼'}</span>
                            )}
                            {cell.type === 'splitter' && (
                              <span className="text-xs font-black">{cell.rot === 0 ? '⑂/' : '⑂\\'}</span>
                            )}
                            {cell.type === 'core' && <Sparkles className="h-4 w-4" />}
                            {cell.type === 'wall' && <span className="h-3.5 w-3.5 rounded-sm bg-slate-400" />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Live Laser Beam SVG Overlay */}
                  <svg
                    viewBox="0 0 5 5"
                    className="pointer-events-none absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]"
                    aria-hidden="true"
                  >
                    {circuitTrace.segments.map((seg, i) => (
                      <line
                        key={i}
                        x1={seg.x1}
                        y1={seg.y1}
                        x2={seg.x2}
                        y2={seg.y2}
                        stroke="#22d3ee"
                        strokeWidth={0.11}
                        strokeLinecap="round"
                        opacity={0.85}
                      />
                    ))}
                  </svg>
                </div>

                {/* Live Solvability Report */}
                <div
                  data-testid="sandbox-validation-panel"
                  className={`flex flex-1 flex-col gap-2 rounded-2xl border-2 p-3 text-xs ${
                    validation.ok
                      ? 'border-emerald-400/70 bg-emerald-500/10'
                      : 'border-amber-400/70 bg-amber-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black">
                    {validation.ok ? (
                      <>
                        <Check className="h-4 w-4 shrink-0 text-emerald-300 stroke-[3]" />
                        <span className="text-emerald-200">Mission Valid & Solvable!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                        <span className="text-amber-200">Needs Tuning Before Play</span>
                      </>
                    )}
                  </div>

                  {validation.ok ? (
                    <div className="space-y-1 text-[11px] font-medium text-slate-200">
                      <div>Recommended Setup: {validation.recommendedProfileLabel}</div>
                      <div className="tabular text-emerald-200">
                        Optimal Par: {validation.recommendedParBudget} pts · {validation.recommendedParBlocks} blocks
                      </div>
                      {(draft.parBudget !== validation.recommendedParBudget ||
                        draft.parBlocks !== validation.recommendedParBlocks) && (
                        <button
                          type="button"
                          onClick={handleAutoApplyPar}
                          className="mt-1 inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-400/70 bg-emerald-500/20 px-2.5 text-[11px] font-black text-emerald-200 hover:bg-emerald-500/30"
                        >
                          Sync Optimal Par
                        </button>
                      )}
                    </div>
                  ) : (
                    <ul className="space-y-1 text-[11px] font-medium text-amber-100">
                      {validation.issues.map((issue, idx) => (
                        <li key={idx}>• {issue}</li>
                      ))}
                    </ul>
                  )}

                  {validation.circuitStartsSolved && (
                    <button
                      id="sandboxLockMirrorBtn"
                      type="button"
                      onClick={handleScrambleMirror}
                      className="flex h-9 items-center justify-center gap-1.5 self-start rounded-xl border border-amber-300 bg-amber-400 px-3 text-[11px] font-black text-slate-950 hover:bg-amber-300 active:scale-95"
                    >
                      <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Flip 1 Mirror to Lock Puzzle</span>
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT ZONE (~40% -> 5 cols): Tool Palettes, Rules, Saved Slots & Classroom Code */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            {/* Palette Tabs */}
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setEditorTab('track')}
                className={`h-9 rounded-xl text-xs font-black transition-colors ${
                  editorTab === 'track' ? 'bg-sky-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Track & Rules
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('circuit')}
                className={`h-9 rounded-xl text-xs font-black transition-colors ${
                  editorTab === 'circuit' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Laser Tools
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('saved')}
                className={`h-9 rounded-xl text-xs font-black transition-colors ${
                  editorTab === 'saved' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Save & Share
              </button>
            </div>

            {editorTab === 'track' && (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-3.5">
                <div>
                  <label htmlFor="sandboxNameInput" className="text-[11px] font-black uppercase text-slate-400">
                    Mission Name
                  </label>
                  <input
                    id="sandboxNameInput"
                    type="text"
                    maxLength={SANDBOX_MAX_NAME_LEN}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((cur) => ({ ...cur, name: e.target.value, updatedAt: Date.now() }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border-2 border-slate-700 bg-slate-900 px-3 text-sm font-bold text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] font-black uppercase text-slate-400">
                    Tile Paint Brush (Tap Inner Tiles)
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {TRACK_BRUSH_META.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        data-track-brush={tool.id}
                        aria-pressed={trackBrush === tool.id}
                        onClick={() => setTrackBrush(tool.id)}
                        className={`flex h-11 flex-col items-center justify-center rounded-xl border-2 text-[11px] font-black transition-transform active:scale-95 ${
                          trackBrush === tool.id
                            ? `${tool.color} ring-2 ring-white`
                            : 'border-slate-700 bg-slate-900 text-slate-300'
                        }`}
                      >
                        {tool.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-slate-300">Energy Budget</span>
                    <span className="tabular text-amber-300">{draft.budget} pts</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Sandbox Energy Budget"
                    min={SANDBOX_MIN_BUDGET}
                    max={SANDBOX_MAX_BUDGET}
                    step={5}
                    value={draft.budget}
                    onChange={(e) =>
                      updateDraft((cur) => ({
                        ...cur,
                        budget: Number(e.target.value),
                        updatedAt: Date.now()
                      }))
                    }
                    className="h-2.5 w-full cursor-pointer accent-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-300">
                    <span>Par Budget</span>
                    <input
                      type="number"
                      min={45}
                      max={draft.budget}
                      step={5}
                      value={draft.parBudget}
                      onChange={(e) =>
                        updateDraft((cur) => ({
                          ...cur,
                          parBudget: Number(e.target.value),
                          updatedAt: Date.now()
                        }))
                      }
                      className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-2.5 text-sm font-black text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-300">
                    <span>Par Blocks</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={draft.parBlocks}
                      onChange={(e) =>
                        updateDraft((cur) => ({
                          ...cur,
                          parBlocks: Number(e.target.value),
                          updatedAt: Date.now()
                        }))
                      }
                      className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-2.5 text-sm font-black text-white"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={draft.loopUnlocked}
                    onClick={() =>
                      updateDraft((cur) => ({ ...cur, loopUnlocked: !cur.loopUnlocked }))
                    }
                    className={`h-10 flex-1 rounded-xl border-2 text-xs font-black ${
                      draft.loopUnlocked
                        ? 'border-teal-400 bg-teal-500/20 text-teal-200'
                        : 'border-slate-700 bg-slate-900 text-slate-400'
                    }`}
                  >
                    LOOP: {draft.loopUnlocked ? 'On' : 'Off'}
                  </button>
                  <button
                    type="button"
                    aria-pressed={draft.ifUnlocked}
                    onClick={() =>
                      updateDraft((cur) => ({ ...cur, ifUnlocked: !cur.ifUnlocked }))
                    }
                    className={`h-10 flex-1 rounded-xl border-2 text-xs font-black ${
                      draft.ifUnlocked
                        ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                        : 'border-slate-700 bg-slate-900 text-slate-400'
                    }`}
                  >
                    IF Sensors: {draft.ifUnlocked ? 'On' : 'Off'}
                  </button>
                </div>

                {/* Debug Class Code Mode ("Fix My Bug!") */}
                <div className="flex flex-col gap-2 rounded-xl border border-violet-500/45 bg-violet-950/20 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-black text-violet-200">
                      <Bug className="h-4 w-4 text-violet-300" aria-hidden="true" />
                      Fix-My-Bug Class Puzzle
                    </span>
                    <button
                      id="sandboxDebugToggleBtn"
                      type="button"
                      aria-pressed={Boolean(draft.isDebugPuzzle)}
                      onClick={() =>
                        updateDraft((cur) => ({
                          ...cur,
                          isDebugPuzzle: !cur.isDebugPuzzle,
                          starterProgram:
                            !cur.isDebugPuzzle && (!cur.starterProgram || cur.starterProgram.length === 0)
                              ? [
                                  { id: 'sb_s1', type: 'MOVE' },
                                  { id: 'sb_s2', type: 'MOVE' }
                                ]
                              : cur.starterProgram,
                          bugClue:
                            !cur.isDebugPuzzle && !cur.bugClue
                              ? 'Find and fix the bug in this starter code!'
                              : cur.bugClue
                        }))
                      }
                      className={`h-8 rounded-lg border px-2.5 text-[11px] font-black ${
                        draft.isDebugPuzzle
                          ? 'border-violet-300 bg-violet-400 text-slate-950'
                          : 'border-slate-700 bg-slate-900 text-slate-300'
                      }`}
                    >
                      {draft.isDebugPuzzle ? 'On' : 'Off'}
                    </button>
                  </div>

                  {draft.isDebugPuzzle && (
                    <div className="flex flex-col gap-2">
                      <input
                        id="sandboxBugClueInput"
                        type="text"
                        maxLength={72}
                        placeholder="Short clue for classmates..."
                        value={draft.bugClue || ''}
                        onChange={(e) =>
                          setDraft((cur) => ({ ...cur, bugClue: e.target.value, updatedAt: Date.now() }))
                        }
                        className="h-9 w-full rounded-lg border border-violet-400/50 bg-slate-900 px-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-violet-300 focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-1">
                        {(['MOVE', 'JUMP', 'BOOST', 'WAIT'] as const).map((cmd) => (
                          <button
                            key={cmd}
                            type="button"
                            onClick={() =>
                              updateDraft((cur) => {
                                const curProg = cur.starterProgram || [];
                                if (curProg.length >= 12) return cur;
                                return {
                                  ...cur,
                                  starterProgram: [
                                    ...curProg,
                                    { id: `sb_b_${Date.now()}_${curProg.length}`, type: cmd }
                                  ]
                                };
                              })
                            }
                            className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-[10px] font-black text-sky-200 hover:border-sky-400"
                          >
                            +{cmd}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(draft.starterProgram || []).map((blk, i) => (
                          <button
                            key={blk.id || i}
                            type="button"
                            onClick={() =>
                              updateDraft((cur) => ({
                                ...cur,
                                starterProgram: (cur.starterProgram || []).filter((_, idx) => idx !== i)
                              }))
                            }
                            title="Tap to remove starter block"
                            className="flex h-7 items-center gap-1 rounded-md border border-violet-400/50 bg-slate-900 px-2 text-[10px] font-black text-violet-100 hover:border-rose-400"
                          >
                            <span>{blk.type}</span>
                            <X className="h-3 w-3 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {editorTab === 'circuit' && (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-3.5">
                <div className="text-[11px] font-black uppercase text-slate-400">
                  Circuit Tool (Tap 5×5 Grid Cells)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {CIRCUIT_BRUSH_META.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      data-circuit-brush={tool.id}
                      aria-pressed={circuitBrush === tool.id}
                      onClick={() => setCircuitBrush(tool.id)}
                      className={`flex h-11 items-center justify-center rounded-xl border-2 text-xs font-black transition-transform active:scale-95 ${
                        circuitBrush === tool.id
                          ? `${tool.tone} ring-2 ring-white`
                          : 'border-slate-700 bg-slate-900 text-slate-300'
                      }`}
                    >
                      {tool.label}
                    </button>
                  ))}
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] font-black uppercase text-slate-400">
                    Load Starter Template
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SANDBOX_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setDraft(normalizeSandboxDraft(preset.draft));
                          setCopiedCode(false);
                        }}
                        className="flex h-9 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-sky-200 hover:border-sky-400"
                      >
                        <Flame className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {editorTab === 'saved' && (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-3.5">
                {/* Shareable Classroom Code */}
                <div className="flex flex-col gap-2 rounded-xl border border-sky-400/40 bg-slate-900 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-black text-sky-200">
                      <Share2 className="h-4 w-4 text-sky-300" aria-hidden="true" />
                      Classroom Challenge Code
                    </span>
                    <button
                      id="copySandboxCodeBtn"
                      type="button"
                      onClick={handleCopyShareCode}
                      className="flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-sky-400/70 bg-sky-500/20 px-2.5 text-[11px] font-black text-sky-100 hover:bg-sky-500/30"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <code
                    data-testid="sandbox-share-code"
                    className="break-all rounded-lg bg-slate-950 p-2 font-mono text-[11px] font-bold text-amber-300"
                  >
                    {shareCode}
                  </code>
                </div>

                {/* Save to Local Sandbox Slots */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase text-slate-400">
                    Saved Creations ({savedLevels.length}/{SANDBOX_MAX_SAVED})
                  </span>
                  <button
                    id="saveSandboxSlotBtn"
                    type="button"
                    onClick={handleSaveSlot}
                    className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-400 bg-emerald-500/20 px-3 text-xs font-black text-emerald-200 hover:bg-emerald-500/30"
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{savedToast ? 'Saved!' : 'Save Slot'}</span>
                  </button>
                </div>

                {savedLevels.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-800 p-3 text-center text-xs text-slate-400">
                    Save your favorite missions here to load or share later.
                  </p>
                ) : (
                  <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                    {savedLevels.map((lvl) => (
                      <div
                        key={lvl.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black text-white">{lvl.name}</div>
                          <div className="tabular text-[10px] font-bold text-slate-400">
                            {lvl.track.length} tiles · {lvl.budget} pts
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDraft(normalizeSandboxDraft(lvl))}
                            aria-label={`Load ${lvl.name}`}
                            className="flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-[11px] font-bold text-sky-200 hover:border-sky-400"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                            <span>Load</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSavedLevel(lvl.id)}
                            aria-label={`Delete ${lvl.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:border-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Primary Launch CTA */}
            <div className="mt-auto flex items-center gap-2 pt-1">
              <button
                id="sandboxSaveQuickBtn"
                type="button"
                onClick={handleSaveSlot}
                className="flex h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border-2 border-slate-700 bg-slate-800 px-4 text-xs font-black text-slate-100 hover:border-sky-400 active:scale-95"
              >
                <Save className="h-4 w-4 text-sky-300" aria-hidden="true" />
                <span>{savedToast ? 'Saved!' : 'Save'}</span>
              </button>
              <button
                id="sandboxTestMissionBtn"
                type="button"
                disabled={!validation.ok}
                onClick={() => {
                  onSaveDraft(draft, false);
                  onTestMission(draft);
                }}
                className="flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 text-sm font-black text-slate-950 shadow-[0_4px_0_#047857] transition-transform active:translate-y-0.5 disabled:opacity-45 disabled:shadow-none"
              >
                <Play className="h-5 w-5 fill-slate-950" aria-hidden="true" />
                <span>Test Mission in 3D</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
