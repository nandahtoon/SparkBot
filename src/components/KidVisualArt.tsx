import React from 'react';
import type { ArcadeGameId } from '../game/arcadeGames';
import type { QuestCounterKey, ShopItemDef } from '../game/shopAndQuests';

/**
 * Hand-crafted commercial K-12 SVG game cartridge illustrations so kids recognize
 * every mini-game at a glance without reading paragraphs of text.
 */
export const ArcadeSceneArt: React.FC<{ gameId: ArcadeGameId; className?: string }> = ({
  gameId,
  className = 'h-24 w-full'
}) => {
  switch (gameId) {
    case 'break_wall':
      return (
        <svg viewBox="0 0 240 104" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="wbBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#172554" />
              <stop offset="100%" stopColor="#091126" />
            </linearGradient>
          </defs>
          <rect width="240" height="104" rx="14" fill="url(#wbBg)" />
          {/* Glowing Reactor Bricks */}
          {[0, 1, 2, 3, 4].map((c) => (
            <rect
              key={`r0-${c}`}
              x={18 + c * 42}
              y={12}
              width="36"
              height="12"
              rx="4"
              fill={c === 2 ? '#f97316' : '#fb7185'}
              stroke="#fff"
              strokeWidth={c === 2 ? '1.5' : '0.6'}
            />
          ))}
          {[0, 1, 2, 3, 4].map((c) => (
            <rect
              key={`r1-${c}`}
              x={18 + c * 42}
              y={29}
              width="36"
              height="12"
              rx="4"
              fill={c === 2 ? '#a855f7' : c % 2 === 0 ? '#38bdf8' : '#f59e0b'}
            />
          ))}
          {/* Bomb dot & Prism diamond */}
          <circle cx="120" cy="18" r="3.5" fill="#fef08a" />
          <polygon points="120,31 124,35 120,39 116,35" fill="#fff" />
          {/* Plasma Orb + Comet Trail */}
          <path d="M136 62 Q122 50 110 46" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" opacity="0.45" fill="none" />
          <circle cx="140" cy="60" r="6" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2.5" />
          {/* Curved Energy Shield + Cute Mini Robot */}
          <rect x="86" y="72" width="68" height="7" rx="3.5" fill="#fbbf24" />
          <rect x="98" y="74" width="44" height="3" rx="1.5" fill="#fffbeb" />
          <rect x="108" y="81" width="24" height="14" rx="6" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="112" y="84" width="16" height="7" rx="3" fill="#0f172a" />
          <circle cx="117" cy="87.5" r="2" fill="#38bdf8" />
          <circle cx="123" cy="87.5" r="2" fill="#38bdf8" />
        </svg>
      );

    case 'connect_nodes':
      return (
        <svg viewBox="0 0 240 104" className={className} aria-hidden="true">
          <rect width="240" height="104" rx="14" fill="#082032" />
          {/* Glowing Conduit Network */}
          <path
            d="M34 52 H92 V28 H156 V52 H206"
            stroke="#22d3ee"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.3"
          />
          <path
            d="M34 52 H92 V28 H156 V52 H206"
            stroke="#38bdf8"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M92 52 V78 H156"
            stroke="#475569"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Source & Power Cores */}
          <circle cx="34" cy="52" r="14" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="2.5" />
          <text x="34" y="57" textAnchor="middle" fill="#082f49" fontSize="14" fontWeight="900">⚡</text>
          <circle cx="206" cy="52" r="14" fill="#10b981" stroke="#a7f3d0" strokeWidth="2.5" />
          <circle cx="206" cy="52" r="6" fill="#ecfdf5" />
          <circle cx="156" cy="78" r="11" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          <circle cx="156" cy="78" r="4" fill="#f59e0b" />
        </svg>
      );

    case 'robot_run':
      return (
        <svg viewBox="0 0 240 104" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="rrBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2e1065" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width="240" height="104" rx="14" fill="url(#rrBg)" />
          {/* 3D Perspective Neon Highway */}
          <polygon points="88,16 152,16 218,104 22,104" fill="#1e1b4b" stroke="#d946ef" strokeWidth="2" />
          <line x1="120" y1="16" x2="120" y2="104" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 6" />
          {/* Glowing Collectible Bolts */}
          <circle cx="120" cy="36" r="6" fill="#fde047" />
          <circle cx="148" cy="58" r="7.5" fill="#fde047" />
          {/* Dashing Robot */}
          <rect x="78" y="64" width="30" height="24" rx="8" fill="#fbbf24" stroke="#0f172a" strokeWidth="2" />
          <rect x="84" y="70" width="18" height="8" rx="3" fill="#0f172a" />
          <circle cx="89" cy="74" r="2.2" fill="#38bdf8" />
          <circle cx="97" cy="74" r="2.2" fill="#38bdf8" />
          <path d="M74 74 H52 M72 82 H58" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'space_shooter':
      return (
        <svg viewBox="0 0 240 104" className={className} aria-hidden="true">
          <rect width="240" height="104" rx="14" fill="#061426" />
          {/* Stars */}
          <circle cx="34" cy="24" r="1.8" fill="#bae6fd" />
          <circle cx="196" cy="20" r="2" fill="#fde047" />
          <circle cx="70" cy="72" r="1.5" fill="#fff" />
          <circle cx="204" cy="74" r="1.6" fill="#38bdf8" />
          {/* Enemy Saucers */}
          <ellipse cx="76" cy="28" rx="16" ry="7" fill="#f43f5e" stroke="#fda4af" strokeWidth="1.5" />
          <ellipse cx="76" cy="24" rx="8" ry="5" fill="#fda4af" />
          <ellipse cx="164" cy="32" rx="16" ry="7" fill="#a855f7" stroke="#e9d5ff" strokeWidth="1.5" />
          <ellipse cx="164" cy="28" rx="8" ry="5" fill="#e9d5ff" />
          {/* Laser Beams */}
          <rect x="117" y="42" width="6" height="20" rx="3" fill="#34d399" />
          {/* Transforming companion robot */}
          <rect x="107" y="72" width="26" height="21" rx="7" fill="#fbbf24" stroke="#fef3c7" strokeWidth="1.5"/>
          <rect x="101" y="56" width="38" height="23" rx="9" fill="#e2e8f0"/>
          <rect x="106" y="61" width="28" height="13" rx="5" fill="#0f172a"/>
          <circle cx="114" cy="67" r="3" fill="#67e8f9"/><circle cx="126" cy="67" r="3" fill="#67e8f9"/>
          <rect x="94" y="73" width="10" height="17" rx="4" fill="#34d399"/><rect x="136" y="73" width="10" height="17" rx="4" fill="#34d399"/>
          <rect x="108" y="90" width="9" height="7" rx="3" fill="#67e8f9"/><rect x="123" y="90" width="9" height="7" rx="3" fill="#67e8f9"/>
        </svg>
      );

    case 'planet_adventure':
      return (
        <svg viewBox="0 0 240 104" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="paBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width="240" height="104" rx="14" fill="url(#paBg)" />
          {/* Alien Planet Horizon & Ringed Moon */}
          <circle cx="188" cy="28" r="14" fill="#34d399" opacity="0.85" />
          <ellipse cx="188" cy="28" rx="24" ry="5" fill="none" stroke="#a7f3d0" strokeWidth="2" transform="rotate(-15 188 28)" />
          <path d="M0 78 Q60 54 126 74 T240 68 V104 H0 Z" fill="#134e4a" />
          {/* Glowing Energy Crystals */}
          <polygon points="62,48 70,62 62,74 54,62" fill="#22d3ee" stroke="#cffafe" strokeWidth="1.5" />
          <polygon points="162,46 170,60 162,72 154,60" fill="#fde047" stroke="#fef9c3" strokeWidth="1.5" />
          {/* Explorer Robot */}
          <rect x="102" y="54" width="32" height="24" rx="8" fill="#fbbf24" stroke="#0f172a" strokeWidth="2" />
          <rect x="108" y="60" width="20" height="9" rx="3" fill="#0f172a" />
          <circle cx="114" cy="64.5" r="2.3" fill="#34d399" />
          <circle cx="122" cy="64.5" r="2.3" fill="#34d399" />
          <rect x="98" y="78" width="40" height="9" rx="4.5" fill="#334155" stroke="#34d399" strokeWidth="1.5" />
        </svg>
      );

    case 'bug_detective':
      return (
        <svg viewBox="0 0 240 104" className={className} aria-hidden="true">
          <rect width="240" height="104" rx="14" fill="#0c1d3d" />
          {/* Visual Code Blocks */}
          <rect x="26" y="20" width="44" height="24" rx="8" fill="#0ea5e9" />
          <path d="M40 32 H56 M51 27 L56 32 L51 37" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="82" y="20" width="44" height="24" rx="8" fill="#f43f5e" stroke="#fecdd3" strokeWidth="2" />
          <circle cx="104" cy="32" r="6" fill="#fff1f2" />
          <rect x="138" y="20" width="44" height="24" rx="8" fill="#10b981" />
          <path d="M152 32 Q160 22 168 32" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          {/* Magnifying Glass Over Bug */}
          <circle cx="104" cy="58" r="20" fill="#38bdf833" stroke="#38bdf8" strokeWidth="3.5" />
          <line x1="119" y1="73" x2="136" y2="90" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
          {/* Cute Bug Icon */}
          <ellipse cx="104" cy="59" rx="8" ry="9" fill="#fb7185" />
          <circle cx="104" cy="49" r="4" fill="#0f172a" />
          <line x1="94" y1="56" x2="88" y2="54" stroke="#fda4af" strokeWidth="2" />
          <line x1="114" y1="56" x2="120" y2="54" stroke="#fda4af" strokeWidth="2" />
        </svg>
      );

    case 'logic_gate_lab':
    default:
      return (
        <svg viewBox="0 0 240 104" className={className} aria-hidden="true">
          <rect width="240" height="104" rx="14" fill="#1b1236" />
          {/* Toggle Switches (1 / 0) */}
          <rect x="22" y="22" width="38" height="20" rx="10" fill="#10b981" />
          <circle cx="50" cy="32" r="7" fill="#ecfdf5" />
          <rect x="22" y="60" width="38" height="20" rx="10" fill="#334155" />
          <circle cx="32" cy="70" r="7" fill="#94a3b8" />
          {/* Wires into Logic Chip */}
          <path d="M60 32 H96 M60 70 H96" stroke="#a78bfa" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M96 24 H120 A26 28 0 0 1 120 80 H96 Z" fill="#7c3aed" stroke="#ddd6fe" strokeWidth="2.5" />
          <text x="116" y="57" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="900">AND</text>
          {/* Output to Glowing Vault Bulb */}
          <line x1="146" y1="52" x2="178" y2="52" stroke="#fde047" strokeWidth="4" />
          <circle cx="196" cy="52" r="16" fill="#fde047" stroke="#fef9c3" strokeWidth="2.5" />
          <text x="196" y="58" textAnchor="middle" fill="#422006" fontSize="15" fontWeight="900">⚡</text>
        </svg>
      );
  }
};

/**
 * Custom toy-box SVG illustration for every Bolt Upgrade Shop item
 * (Drones, Head Gear, and Trails) so kids shop by sight, not reading.
 */
export const ShopItemArt: React.FC<{ item: ShopItemDef; className?: string }> = ({
  item,
  className = 'h-16 w-16'
}) => {
  if (item.category === 'drone') {
    const isOwl = item.id === 'golden_owl';
    const isBee = item.id === 'magneto_bee';
    const isJet = item.id === 'turbo_comet';
    return (
      <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
        <circle cx="36" cy="36" r="28" fill={`${item.primaryHex}22`} />
        {/* Wings / Thrusters */}
        {isJet ? (
          <>
            <polygon points="8,36 22,26 22,46" fill={item.accentHex} />
            <polygon points="64,36 50,26 50,46" fill={item.accentHex} />
          </>
        ) : (
          <>
            <ellipse cx="14" cy="34" rx="10" ry="5.5" fill={item.accentHex} transform="rotate(-18 14 34)" />
            <ellipse cx="58" cy="34" rx="10" ry="5.5" fill={item.accentHex} transform="rotate(18 58 34)" />
          </>
        )}
        {/* Drone Orb Body */}
        <circle cx="36" cy="38" r="17" fill={item.primaryHex} stroke="#0f172a" strokeWidth="2.5" />
        {/* Bee Stripes */}
        {isBee && (
          <>
            <path d="M21 34 H51" stroke="#0f172a" strokeWidth="3.5" opacity="0.65" />
            <path d="M23 45 H49" stroke="#0f172a" strokeWidth="3.5" opacity="0.65" />
          </>
        )}
        {/* Owl Crown */}
        {isOwl && (
          <polygon points="24,22 29,12 36,19 43,12 48,22" fill="#fde047" stroke="#b45309" strokeWidth="1.5" />
        )}
        {/* Glowing Face Visor */}
        <rect x="24" y="31" width="24" height="12" rx="6" fill="#0f172a" />
        <circle cx="31" cy="37" r="3" fill={item.accentHex} />
        <circle cx="41" cy="37" r="3" fill={item.accentHex} />
      </svg>
    );
  }

  if (item.category === 'accessory') {
    if (item.id === 'explorer_cap') {
      return (
        <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
          <path d="M16 44 C16 24 56 24 56 44 Z" fill={item.primaryHex} stroke="#0f172a" strokeWidth="2.5" />
          <path d="M14 44 H62 C62 50 52 52 38 50 L14 48 Z" fill={item.accentHex} stroke="#0f172a" strokeWidth="2" />
          <circle cx="36" cy="24" r="4" fill={item.accentHex} />
        </svg>
      );
    }
    if (item.id === 'holo_visor') {
      return (
        <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
          <path d="M12 30 H60 L54 48 H18 Z" fill={item.primaryHex} stroke="#e0f2fe" strokeWidth="2.5" />
          <line x1="20" y1="36" x2="52" y2="36" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <rect x="8" y="32" width="6" height="12" rx="2" fill={item.accentHex} />
          <rect x="58" y="32" width="6" height="12" rx="2" fill={item.accentHex} />
        </svg>
      );
    }
    if (item.id === 'antenna_halo') {
      return (
        <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
          <ellipse cx="36" cy="36" rx="24" ry="9" fill="none" stroke={item.primaryHex} strokeWidth="6" />
          <ellipse cx="36" cy="36" rx="24" ry="9" fill="none" stroke={item.accentHex} strokeWidth="2" strokeDasharray="7 6" />
          <circle cx="36" cy="36" r="5" fill="#fef08a" />
        </svg>
      );
    }
    // star_crown
    return (
      <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
        <polygon
          points="14,50 18,22 30,36 36,16 42,36 54,22 58,50"
          fill={item.primaryHex}
          stroke="#fef08a"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="36" cy="40" r="4.5" fill={item.accentHex} />
        <circle cx="23" cy="42" r="3" fill="#38bdf8" />
        <circle cx="49" cy="42" r="3" fill="#38bdf8" />
      </svg>
    );
  }

  // Kinetic Motion Trails
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
      <path
        d="M12 50 Q28 46 38 34 T60 18"
        stroke={item.primaryHex}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
      <path
        d="M14 49 Q30 44 40 33 T58 20"
        stroke={item.accentHex}
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="58" cy="20" r="6" fill="#ffffff" stroke={item.primaryHex} strokeWidth="2.5" />
      <circle cx="24" cy="34" r="3.5" fill={item.accentHex} />
      <circle cx="44" cy="48" r="3" fill={item.primaryHex} />
    </svg>
  );
};

/**
 * Instant-recognition visual pictogram for Mastery Skill Quests (no reading needed!).
 */
export const QuestGoalArt: React.FC<{ counterKey: QuestCounterKey; className?: string }> = ({
  counterKey,
  className = 'h-11 w-11'
}) => {
  switch (counterKey) {
    case 'bugsSquashed':
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="14" fill="#4c1d95" />
          <ellipse cx="24" cy="27" rx="9" ry="10" fill="#fb7185" />
          <circle cx="24" cy="15" r="5" fill="#fde047" />
          <path d="M12 22 L17 24 M36 22 L31 24 M11 30 L16 30 M37 30 L32 30" stroke="#fda4af" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'crystalsCollected':
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="14" fill="#0c4a6e" />
          <polygon points="24,8 36,24 24,40 12,24" fill="#22d3ee" stroke="#cffafe" strokeWidth="2" />
          <polygon points="24,13 30,24 24,35 18,24" fill="#e0f2fe" opacity="0.65" />
        </svg>
      );
    case 'loopsUsed':
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="14" fill="#064e3b" />
          <path d="M33 20 A11 11 0 1 0 34 29" stroke="#34d399" strokeWidth="4" strokeLinecap="round" fill="none" />
          <polygon points="34,12 37,22 27,20" fill="#a7f3d0" />
        </svg>
      );
    case 'predictionsCorrect':
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="14" fill="#78350f" />
          <circle cx="24" cy="22" r="10" fill="#fbbf24" />
          <rect x="20" y="33" width="8" height="5" rx="2" fill="#fde047" />
          <path d="M20 22 L23 25 L29 18" stroke="#451a03" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    case 'conditionalsUsed':
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="14" fill="#3b0764" />
          <path d="M10 24 Q24 12 38 24 Q24 36 10 24 Z" fill="#c084fc" stroke="#f5d0fe" strokeWidth="2" />
          <circle cx="24" cy="24" r="5" fill="#1e1b4b" />
          <circle cx="25.5" cy="22.5" r="2" fill="#ffffff" />
        </svg>
      );
    case 'functionsUsed':
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="14" fill="#0c4a6e" />
          <rect x="10" y="13" width="28" height="22" rx="7" fill="#38bdf8" stroke="#bae6fd" strokeWidth="2" />
          <text x="24" y="29" textAnchor="middle" fill="#082f49" fontSize="15" fontWeight="900">f(x)</text>
        </svg>
      );
    case 'shopBought':
    default:
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="14" fill="#713f12" />
          <rect x="12" y="18" width="24" height="20" rx="5" fill="#fbbf24" stroke="#fef08a" strokeWidth="2" />
          <path d="M18 18 V14 A6 6 0 0 1 30 14 V18" stroke="#fef08a" strokeWidth="3" fill="none" />
          <text x="24" y="33" textAnchor="middle" fill="#422006" fontSize="13" fontWeight="900">⚡</text>
        </svg>
      );
  }
};
