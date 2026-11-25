import React, { useEffect } from 'react';
import { Check, X, Zap } from 'lucide-react';
import { PARTS, type BlockType, type PartId, type SensorCondition } from '../game/engine';
import { BlockIcon, HazardIcon, PartIcon } from './Icons';

export type DemoTopic = PartId | BlockType | 'CIRCUIT_MIRROR' | 'CIRCUIT_SPLITTER';

export interface DemoRequest {
  topic: DemoTopic;
  condition?: SensorCondition;
}

interface ConceptDemoPopoverProps {
  demo: DemoRequest | null;
  onSelectDemo?: (next: DemoRequest) => void;
  onClose: () => void;
}

const PART_TOPICS: DemoRequest[] = [
  { topic: 'wheels' },
  { topic: 'treads' },
  { topic: 'thrusters' },
  { topic: 'booster' },
  { topic: 'laser' },
  { topic: 'magnet' }
];

const CODE_TOPICS: DemoRequest[] = [
  { topic: 'MOVE' },
  { topic: 'JUMP' },
  { topic: 'BOOST' },
  { topic: 'LOOP' },
  { topic: 'IF', condition: 'GAP' },
  { topic: 'IF', condition: 'MUD' },
  { topic: 'IF', condition: 'RAMP' }
];

const CIRCUIT_TOPICS: DemoRequest[] = [
  { topic: 'CIRCUIT_MIRROR' },
  { topic: 'CIRCUIT_SPLITTER' }
];

function getTopicLabel(req: DemoRequest): string {
  if (req.topic === 'CIRCUIT_MIRROR') return 'Mirror';
  if (req.topic === 'CIRCUIT_SPLITTER') return 'Splitter';
  if (req.topic === 'IF') return `If ${req.condition || 'GAP'}`;
  if (req.topic === 'MOVE') return 'Move';
  if (req.topic === 'JUMP') return 'Jump';
  if (req.topic === 'BOOST') return 'Boost';
  if (req.topic === 'LOOP') return 'Loop';
  return PARTS[req.topic].name;
}

const DemoHeaderEmblem: React.FC<{ demo: DemoRequest }> = ({ demo }) => {
  if (demo.topic === 'CIRCUIT_MIRROR') {
    return (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <rect x="6" y="6" width="36" height="36" rx="10" fill="#0f172a" stroke="#22d3ee" strokeWidth="2.5" />
        <line x1="15" y1="33" x2="33" y2="15" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }
  if (demo.topic === 'CIRCUIT_SPLITTER') {
    return (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <rect x="6" y="6" width="36" height="36" rx="10" fill="#0f172a" stroke="#a78bfa" strokeWidth="2.5" />
        <line x1="14" y1="14" x2="34" y2="34" stroke="#c4b5fd" strokeWidth="5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="4" fill="#22d3ee" />
      </svg>
    );
  }
  if (
    demo.topic === 'MOVE' ||
    demo.topic === 'JUMP' ||
    demo.topic === 'BOOST' ||
    demo.topic === 'LOOP' ||
    demo.topic === 'IF'
  ) {
    return <BlockIcon type={demo.topic} condition={demo.condition || 'GAP'} className="h-10 w-10" />;
  }
  return <PartIcon id={demo.topic} className="h-10 w-10" />;
};

const WrongOutcomeSvg: React.FC<{ demo: DemoRequest }> = ({ demo }) => {
  const t = demo.topic;
  if (t === 'treads' || (t === 'IF' && demo.condition === 'MUD')) {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <rect x="8" y="56" width="104" height="16" rx="6" fill="#78350f" />
        <path d="M16 56c10-6 18 6 28 0s18-6 28 0 18 6 28 0" stroke="#d97706" strokeWidth="3" fill="none" />
        <g transform="translate(46,34) rotate(12)">
          <rect x="0" y="0" width="26" height="20" rx="5" fill="#fbbf24" stroke="#1e293b" strokeWidth="2" />
          <circle cx="7" cy="22" r="6" fill="#334155" stroke="#fb7185" strokeWidth="2" />
          <circle cx="20" cy="22" r="6" fill="#334155" stroke="#fb7185" strokeWidth="2" />
        </g>
        <path d="M36 48l-6-8M82 48l6-8" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (t === 'thrusters' || t === 'JUMP' || (t === 'IF' && demo.condition === 'GAP')) {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <rect x="6" y="54" width="32" height="18" rx="4" fill="#334155" />
        <rect x="82" y="54" width="32" height="18" rx="4" fill="#334155" />
        <path d="M40 54h40" stroke="#fb7185" strokeWidth="2" strokeDasharray="4 4" />
        <g transform="translate(47,42) rotate(28)">
          <rect x="0" y="0" width="24" height="18" rx="5" fill="#fbbf24" stroke="#1e293b" strokeWidth="2" />
          <circle cx="6" cy="20" r="4.5" fill="#475569" />
          <circle cx="18" cy="20" r="4.5" fill="#475569" />
        </g>
        <path d="M60 22v14m0 0-5-5m5 5 5-5" stroke="#fb7185" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (t === 'booster' || t === 'BOOST' || (t === 'IF' && demo.condition === 'RAMP')) {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <polygon points="36,68 104,24 104,68" fill="#831843" stroke="#f472b6" strokeWidth="2" />
        <rect x="8" y="58" width="34" height="12" rx="4" fill="#334155" />
        <g transform="translate(28,40) rotate(-18)">
          <rect x="0" y="0" width="24" height="18" rx="5" fill="#fbbf24" stroke="#1e293b" strokeWidth="2" />
          <circle cx="6" cy="20" r="4.5" fill="#475569" />
          <circle cx="18" cy="20" r="4.5" fill="#475569" />
        </g>
        <path d="M22 30l-8 8" stroke="#fb7185" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (t === 'laser') {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <rect x="14" y="20" width="26" height="18" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
        <rect x="46" y="20" width="26" height="18" rx="4" fill="#1e293b" stroke="#fb7185" strokeWidth="2.5" strokeDasharray="3 2" />
        <rect x="78" y="20" width="26" height="18" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
        <rect x="52" y="24" width="14" height="10" rx="2" fill="#22d3ee" />
      </svg>
    );
  }
  if (t === 'magnet') {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <rect x="18" y="34" width="24" height="20" rx="5" fill="#fbbf24" stroke="#1e293b" strokeWidth="2" />
        <circle cx="88" cy="22" r="6" fill="#fbbf24" opacity="0.45" />
        <circle cx="96" cy="48" r="6" fill="#fbbf24" opacity="0.45" />
        <path d="M52 40h22" stroke="#fb7185" strokeWidth="2.5" strokeDasharray="4 4" />
      </svg>
    );
  }
  if (t === 'LOOP') {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <rect x="12" y="30" width="20" height="20" rx="5" fill="#0284c7" />
        <rect x="36" y="30" width="20" height="20" rx="5" fill="#0284c7" />
        <rect x="60" y="30" width="20" height="20" rx="5" fill="#0284c7" />
        <rect x="84" y="30" width="20" height="20" rx="5" fill="#fb7185" />
      </svg>
    );
  }
  if (t === 'CIRCUIT_MIRROR' || t === 'CIRCUIT_SPLITTER') {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <line x1="12" y1="42" x2="60" y2="42" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
        <line x1="52" y1="32" x2="68" y2="52" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
        <line x1="60" y1="42" x2="60" y2="72" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" strokeDasharray="4 4" />
        <circle cx="94" cy="22" r="10" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />
      </svg>
    );
  }
  // wheels / MOVE
  return (
    <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
      <rect x="12" y="54" width="96" height="14" rx="5" fill="#334155" />
      <rect x="22" y="28" width="26" height="20" rx="5" fill="#fbbf24" stroke="#fb7185" strokeWidth="2.5" />
      <path d="M56 38h28" stroke="#fb7185" strokeWidth="2.5" strokeDasharray="4 4" />
    </svg>
  );
};

const RightOutcomeSvg: React.FC<{ demo: DemoRequest }> = ({ demo }) => {
  const t = demo.topic;
  if (t === 'treads') {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <rect x="8" y="56" width="104" height="16" rx="6" fill="#78350f" />
        <g className="anim-stage-nudge" style={{ transformOrigin: '60px 42px' }}>
          <rect x="44" y="26" width="30" height="20" rx="5" fill="#fbbf24" stroke="#1e293b" strokeWidth="2" />
          <rect x="38" y="45" width="42" height="12" rx="6" fill="#0f172a" stroke="#34d399" strokeWidth="2.8" />
          <circle cx="46" cy="51" r="2.5" fill="#34d399" />
          <circle cx="59" cy="51" r="2.5" fill="#fbbf24" />
          <circle cx="72" cy="51" r="2.5" fill="#34d399" />
        </g>
        <path d="M88 38h18m0 0-5-5m5 5-5 5" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (t === 'thrusters' || t === 'JUMP') {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <rect x="6" y="54" width="32" height="18" rx="4" fill="#334155" />
        <rect x="82" y="54" width="32" height="18" rx="4" fill="#334155" />
        <path d="M22 50C38 14 82 14 96 50" stroke="#38bdf8" strokeWidth="3" strokeDasharray="5 4" fill="none" />
        <g className="anim-happy" style={{ transformOrigin: '60px 26px' }}>
          <rect x="48" y="12" width="24" height="18" rx="5" fill="#fbbf24" stroke="#1e293b" strokeWidth="2" />
          <path d="M52 31l3 9 3-9M62 31l3 9 3-9" fill="#fb923c" />
        </g>
      </svg>
    );
  }
  if (t === 'booster' || t === 'BOOST') {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <polygon points="34,68 96,28 96,68" fill="#be185d" stroke="#f472b6" strokeWidth="2" />
        <path d="M18 52c26-14 54-30 84-34" stroke="#f472b6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <g className="anim-reward-hop" style={{ transformOrigin: '74px 26px' }}>
          <rect x="62" y="14" width="24" height="18" rx="5" fill="#fbbf24" stroke="#1e293b" strokeWidth="2" />
          <polygon points="52,20 62,23 52,28" fill="#fb923c" />
        </g>
      </svg>
    );
  }
  if (t === 'laser') {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <rect x="14" y="20" width="26" height="18" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
        <rect x="46" y="20" width="26" height="18" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
        <rect x="78" y="20" width="26" height="18" rx="4" fill="#1e293b" stroke="#34d399" strokeWidth="2.5" />
        <rect x="84" y="24" width="14" height="10" rx="2" fill="#22d3ee" />
        <line x1="98" y1="29" x2="116" y2="29" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" className="anim-dot-pulse" />
      </svg>
    );
  }
  if (t === 'magnet') {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <rect x="18" y="32" width="26" height="20" rx="5" fill="#fbbf24" stroke="#1e293b" strokeWidth="2" />
        <path d="M44 42c16-14 28-14 38-18" stroke="#818cf8" strokeWidth="2.5" strokeDasharray="3 3" fill="none" />
        <path d="M44 42c16 14 28 14 38 10" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="3 3" fill="none" />
        <circle cx="88" cy="24" r="6" fill="#fbbf24" className="anim-reward-hop" />
        <circle cx="88" cy="52" r="6" fill="#fbbf24" className="anim-reward-hop" />
      </svg>
    );
  }
  if (t === 'LOOP') {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <rect x="18" y="16" width="84" height="52" rx="14" fill="#064e3b" stroke="#34d399" strokeWidth="3" />
        <rect x="34" y="30" width="22" height="22" rx="6" fill="#38bdf8" />
        <path d="M39 41h12m0 0-4-4m4 4-4 4" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="64" y="30" width="24" height="22" rx="6" fill="#34d399" />
        <text x="76" y="45" textAnchor="middle" fill="#0f172a" fontSize="13" fontWeight="900">
          ×3
        </text>
      </svg>
    );
  }
  if (t === 'IF') {
    const cond = demo.condition || 'GAP';
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <rect x="12" y="14" width="96" height="56" rx="14" fill="#2e1065" stroke="#a78bfa" strokeWidth="2.5" />
        <path d="M22 42s7-10 16-10 16 10 16 10-7 10-16 10-16-10-16-10Z" stroke="#c084fc" strokeWidth="2.5" fill="none" />
        <circle cx="38" cy="42" r="4.5" fill="#22d3ee" className="anim-dot-pulse" />
        <path d="M62 42h12m0 0-4-4m4 4-4 4" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="80" y="28" width="20" height="28" rx="6" fill={cond === 'RAMP' ? '#f472b6' : '#fbbf24'} />
      </svg>
    );
  }
  if (t === 'CIRCUIT_MIRROR') {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <line x1="12" y1="44" x2="60" y2="44" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
        <line x1="50" y1="54" x2="70" y2="34" stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
        <line x1="60" y1="44" x2="60" y2="18" stroke="#34d399" strokeWidth="4" strokeLinecap="round" className="anim-dot-pulse" />
        <circle cx="60" cy="14" r="9" fill="#10b981" stroke="#6ee7b7" strokeWidth="2.5" />
      </svg>
    );
  }
  if (t === 'CIRCUIT_SPLITTER') {
    return (
      <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
        <line x1="10" y1="42" x2="54" y2="42" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
        <line x1="46" y1="34" x2="62" y2="50" stroke="#c4b5fd" strokeWidth="5" strokeLinecap="round" />
        <line x1="54" y1="42" x2="96" y2="42" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="54" y1="42" x2="54" y2="16" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="102" cy="42" r="8" fill="#10b981" stroke="#6ee7b7" strokeWidth="2" />
        <circle cx="54" cy="12" r="8" fill="#10b981" stroke="#6ee7b7" strokeWidth="2" />
      </svg>
    );
  }
  // wheels / MOVE
  return (
    <svg viewBox="0 0 120 84" className="h-24 w-full" aria-hidden="true">
      <rect x="12" y="54" width="96" height="14" rx="5" fill="#334155" />
      <g className="anim-stage-nudge" style={{ transformOrigin: '52px 38px' }}>
        <rect x="34" y="24" width="26" height="20" rx="5" fill="#fbbf24" stroke="#1e293b" strokeWidth="2" />
        <circle cx="40" cy="47" r="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
        <circle cx="54" cy="47" r="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
      </g>
      <path d="M72 36h24m0 0-6-6m6 6-6 6" stroke="#34d399" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

function getDemoExplanation(demo: DemoRequest): { title: string; why: string } {
  if (demo.topic === 'CIRCUIT_MIRROR') {
    return {
      title: 'Law of Reflection',
      why: 'A flat mirror bounces a straight laser beam 90 degrees so light can reach around corners.'
    };
  }
  if (demo.topic === 'CIRCUIT_SPLITTER') {
    return {
      title: 'Beam Splitter',
      why: 'Half the beam passes straight through while the rest bounces sideways, powering two cores at once!'
    };
  }
  if (demo.topic === 'LOOP') {
    return {
      title: 'Pattern Loops',
      why: 'A LOOP repeats the blocks inside it, shrinking long sequences so you stay under your block budget.'
    };
  }
  if (demo.topic === 'IF') {
    if (demo.condition === 'MUD') {
      return {
        title: 'Sensor Check · Mud Ahead',
        why: 'IF [MUD] looks 1 tile ahead and only runs its action when sticky mud is detected.'
      };
    }
    if (demo.condition === 'RAMP') {
      return {
        title: 'Sensor Check · Ramp Ahead',
        why: 'IF [RAMP] spots steep slopes ahead so SparkBot triggers BOOST right before climbing.'
      };
    }
    return {
      title: 'Sensor Check · Gap Ahead',
      why: 'IF [GAP] scans 1 tile ahead and triggers JUMP only when there is an open pit!'
    };
  }
  if (demo.topic === 'MOVE') {
    return {
      title: 'Step Move (+1 Tile)',
      why: 'Each MOVE rolls SparkBot forward 1 flat tile using wheels or treads.'
    };
  }
  if (demo.topic === 'JUMP' || demo.topic === 'thrusters') {
    return {
      title: 'Thruster Leap (+2 Tiles)',
      why: 'Downward thrust lifts SparkBot into a parabolic arc so it clears an open gap.'
    };
  }
  if (demo.topic === 'BOOST' || demo.topic === 'booster') {
    return {
      title: 'Turbo Boost (+3 Tiles)',
      why: 'Extra forward force lets SparkBot climb steep inclined ramps without sliding back.'
    };
  }
  if (demo.topic === 'treads') {
    return {
      title: 'Wide Traction Treads',
      why: 'Treads spread robot weight across wide tracks so it grips soft mud instead of sinking.'
    };
  }
  if (demo.topic === 'laser') {
    return {
      title: 'Front Column Laser',
      why: 'Attaching the Laser Emitter to a right-hand FRONT slot aims its beam straight at the exit gate.'
    };
  }
  if (demo.topic === 'magnet') {
    return {
      title: 'Magnet Collector',
      why: 'Magnetic coils pull nearby shiny crystals and bolts straight toward SparkBot.'
    };
  }
  return {
    title: 'Low-Friction Wheels',
    why: 'Spinning wheels reduce ground drag so SparkBot rolls smoothly on flat workshop tracks.'
  };
}

export const ConceptDemoPopover: React.FC<ConceptDemoPopoverProps> = ({
  demo,
  onSelectDemo,
  onClose
}) => {
  useEffect(() => {
    if (!demo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [demo, onClose]);

  if (!demo) return null;

  const isPart = demo.topic in PARTS;
  const partCost = isPart ? PARTS[demo.topic as PartId].cost : null;
  const distanceChip =
    demo.topic === 'MOVE' ? '+1' : demo.topic === 'JUMP' ? '+2' : demo.topic === 'BOOST' ? '+3' : null;
  const info = getDemoExplanation(demo);

  return (
    <div
      id="conceptDemoPopover"
      role="dialog"
      aria-modal="true"
      aria-label="Visual Learning Demo"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex w-full max-w-md flex-col gap-3 rounded-3xl border-2 border-sky-400/80 bg-slate-900 p-4 shadow-2xl sm:p-5"
      >
        {/* Header: Topic Icon + Title + Metric + Close Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800">
              <DemoHeaderEmblem demo={demo} />
            </div>
            {demo.topic === 'IF' && demo.condition && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-400/70 bg-violet-500/20">
                <HazardIcon cond={demo.condition} className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-white sm:text-base">{info.title}</h3>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 tabular-nums">
                {partCost !== null && (
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {partCost} Energy
                  </span>
                )}
                {distanceChip && <span className="text-sky-300">Distance {distanceChip}</span>}
              </div>
            </div>
          </div>

          <button
            id="closeDemoBtn"
            type="button"
            onClick={onClose}
            aria-label="Close Visual Demo"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-slate-200 hover:border-sky-400 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Topic Switcher (replaces per-block/per-part overlapping mini book badges) */}
        {onSelectDemo && (
          <div
            role="tablist"
            aria-label="Visual Guide Topics"
            className="no-scrollbar touch-pan-x flex items-center gap-1.5 overflow-x-auto pb-0.5"
          >
            {(demo.topic === 'CIRCUIT_MIRROR' || demo.topic === 'CIRCUIT_SPLITTER'
              ? CIRCUIT_TOPICS
              : demo.topic === 'MOVE' ||
                  demo.topic === 'JUMP' ||
                  demo.topic === 'BOOST' ||
                  demo.topic === 'LOOP' ||
                  demo.topic === 'IF'
                ? CODE_TOPICS
                : PART_TOPICS
            ).map((item) => {
              const active =
                item.topic === demo.topic &&
                (item.topic !== 'IF' || (item.condition || 'GAP') === (demo.condition || 'GAP'));
              const key = `${item.topic}_${item.condition || ''}`;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelectDemo(item)}
                  className={`flex h-8 shrink-0 items-center whitespace-nowrap rounded-xl border px-2.5 text-[11px] font-black transition-colors active:scale-95 ${
                    active
                      ? 'border-sky-300 bg-sky-500/25 text-white'
                      : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-sky-400/70 hover:text-white'
                  }`}
                >
                  {getTopicLabel(item)}
                </button>
              );
            })}
          </div>
        )}

        {/* Wrong vs Right Side-by-Side Visual Comparison Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div
            aria-label="Wrong setup"
            className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-rose-400/70 bg-rose-950/35 p-3"
          >
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-slate-950 shadow">
                <X className="h-4 w-4 stroke-[3]" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wide text-rose-200">
                Problem
              </span>
            </div>
            <WrongOutcomeSvg demo={demo} />
          </div>

          <div
            aria-label="Right setup"
            className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-emerald-400/80 bg-emerald-950/35 p-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow">
                <Check className="h-4 w-4 stroke-[3]" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wide text-emerald-200">
                Solution
              </span>
            </div>
            <RightOutcomeSvg demo={demo} />
          </div>
        </div>

        {/* Plain-English STEM Principle ("Why It Works") */}
        <div
          data-testid="concept-demo-why"
          className="rounded-2xl border border-sky-400/35 bg-slate-950/85 px-3.5 py-2.5 text-left"
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-sky-300">
            Why It Works
          </div>
          <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-200">
            {info.why}
          </p>
        </div>
      </div>
    </div>
  );
};
