import React from 'react';
import type { BlockType, PartId, SensorCondition } from '../game/engine';

export const SparkBotEmblem: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="sbArmor" x1="14" y1="22" x2="66" y2="70" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fde047" />
        <stop offset="1" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <circle cx="40" cy="40" r="37" fill="#0f172a" stroke="#38bdf8" strokeWidth="3.5" />
    {/* Antenna */}
    <line x1="40" y1="8" x2="40" y2="18" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
    <circle cx="40" cy="8" r="4.5" fill="#38bdf8" />
    {/* Binocular Pods */}
    <rect x="17" y="17" width="21" height="19" rx="9" fill="#e2e8f0" stroke="#1e293b" strokeWidth="2.5" />
    <rect x="42" y="17" width="21" height="19" rx="9" fill="#e2e8f0" stroke="#1e293b" strokeWidth="2.5" />
    <circle cx="27.5" cy="26.5" r="5.5" fill="#0f172a" />
    <circle cx="52.5" cy="26.5" r="5.5" fill="#0f172a" />
    <circle cx="26" cy="25" r="2.2" fill="#38bdf8" />
    <circle cx="51" cy="25" r="2.2" fill="#38bdf8" />
    {/* Solar Amber Body */}
    <rect x="20" y="39" width="40" height="24" rx="7" fill="url(#sbArmor)" stroke="#1e293b" strokeWidth="2.5" />
    <path d="M35 45h10l-3 6h5l-9 9 2-7h-5l3-8Z" fill="#0f172a" />
    {/* Treads */}
    <rect x="15" y="61" width="16" height="9" rx="4.5" fill="#334155" stroke="#38bdf8" strokeWidth="1.5" />
    <rect x="49" y="61" width="16" height="9" rx="4.5" fill="#334155" stroke="#38bdf8" strokeWidth="1.5" />
  </svg>
);

export const PartIcon: React.FC<{ id: PartId; className?: string }> = ({ id, className = 'w-10 h-10' }) => {
  switch (id) {
    case 'wheels':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <circle cx="15" cy="30" r="10" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
          <circle cx="15" cy="30" r="4" fill="#cbd5e1" />
          <circle cx="34" cy="30" r="10" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
          <circle cx="34" cy="30" r="4" fill="#cbd5e1" />
          <path d="M15 24h19" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'treads':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <path d="M7 33a6 6 0 0 1 5-6l6-9h12l6 9a6 6 0 0 1-1 12H12a6 6 0 0 1-5-6Z" fill="#0f172a" stroke="#34d399" strokeWidth="3.2" />
          <circle cx="14" cy="32" r="3.5" fill="#34d399" />
          <circle cx="24" cy="24" r="3.5" fill="#fbbf24" />
          <circle cx="34" cy="32" r="3.5" fill="#34d399" />
        </svg>
      );
    case 'thrusters':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <rect x="13" y="8" width="9" height="22" rx="4.5" fill="#ef4444" stroke="#f8fafc" strokeWidth="2" />
          <rect x="26" y="8" width="9" height="22" rx="4.5" fill="#ef4444" stroke="#f8fafc" strokeWidth="2" />
          <path d="M14 31l3.5 11 3.5-11Z" fill="#fbbf24" />
          <path d="M27 31l3.5 11 3.5-11Z" fill="#38bdf8" />
        </svg>
      );
    case 'booster':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <path d="M24 8l14 14-5 3v10H15V25l-5-3L24 8Z" fill="#f472b6" stroke="#fdf2f8" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M19 36l5 8 5-8" fill="#fbbf24" />
        </svg>
      );
    case 'laser':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <rect x="6" y="18" width="16" height="12" rx="3" fill="#334155" stroke="#22d3ee" strokeWidth="2.4" />
          <polygon points="22,20 30,24 22,28" fill="#67e8f9" />
          <line x1="30" y1="24" x2="45" y2="24" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
          <circle cx="42" cy="24" r="3.5" fill="#a5f3fc" />
        </svg>
      );
    case 'magnet':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <path d="M12 10v15a12 12 0 0 0 24 0V10" stroke="#818cf8" strokeWidth="7" strokeLinecap="round" />
          <rect x="8.5" y="9" width="7" height="7" rx="1.5" fill="#f8fafc" />
          <rect x="32.5" y="9" width="7" height="7" rx="1.5" fill="#f8fafc" />
          <path d="M19 14l5-6 5 6" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
};

export const HazardIcon: React.FC<{ cond: SensorCondition; className?: string }> = ({ cond, className = 'w-6 h-6' }) => {
  if (cond === 'GAP') {
    return (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
        <path d="M2 20h7v8H2zM23 20h7v8h-7z" fill="#64748b" />
        <path d="M12 20l4 7 4-7" stroke="#fb7185" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 5l5 9H11l5-9Z" fill="#fb7185" />
      </svg>
    );
  }
  if (cond === 'MUD') {
    return (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
        <path d="M4 22c3-5 6-5 9 0s6 5 9 0 5-4 6 0v6H4v-6Z" fill="#b45309" stroke="#fbbf24" strokeWidth="1.8" />
        <circle cx="11" cy="12" r="3" fill="#d97706" />
        <circle cx="21" cy="9" r="2.2" fill="#f59e0b" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <polygon points="4,26 28,10 28,26" fill="#be185d" stroke="#f472b6" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M7 18l11-7m0 0h-5m5 0v5" stroke="#fdf2f8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const BlockIcon: React.FC<{
  type: BlockType;
  condition?: SensorCondition;
  className?: string;
}> = ({ type, condition = 'GAP', className = 'w-9 h-9' }) => {
  if (type === 'MOVE') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
        <path d="M7 20h23m0 0-8-8m8 8-8 8" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'JUMP') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
        <path d="M6 29c4-14 18-16 26-4" stroke="#fbbf24" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M25 26l8 1-1-8" stroke="#fbbf24" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'BOOST') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
        <path d="M22 5L9 22h10l-2 13 14-18H21l1-12Z" fill="#f472b6" stroke="#fdf2f8" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'LOOP') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
        <path d="M12 14a10 10 0 0 1 17-3l2 3M28 26a10 10 0 0 1-17 3l-2-3" stroke="#34d399" strokeWidth="3.8" strokeLinecap="round" />
        <polygon points="32,7 33,16 25,13" fill="#34d399" />
        <polygon points="8,33 7,24 15,27" fill="#34d399" />
      </svg>
    );
  }
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
        <path d="M2 14s5-8 12-8 12 8 12 8-5 8-12 8-12-8-12-8Z" stroke="#c084fc" strokeWidth="2.5" />
        <circle cx="14" cy="14" r="3.8" fill="#c084fc" />
      </svg>
      <HazardIcon cond={condition} className="w-6 h-6" />
    </div>
  );
};
