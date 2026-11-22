import React, { useEffect, useState } from 'react';
import type { TutorialStep } from '../game/engine';

interface GhostHandProps {
  visible: boolean;
  step: TutorialStep | null;
}

export const GhostHand: React.FC<GhostHandProps> = ({ visible, step }) => {
  const [coords, setCoords] = useState<{ fromX: number; fromY: number; toX: number; toY: number } | null>(null);

  useEffect(() => {
    if (!visible || !step || !step.targetType) {
      setCoords(null);
      return;
    }

    const compute = () => {
      let fromEl: Element | null = null;
      let toEl: Element | null = null;

      if (step.targetType === 'part' && step.targetKey) {
        fromEl = document.querySelector(`[data-part="${step.targetKey}"]`);
        const slotKey =
          step.targetKey === 'laser'
            ? '1,2'
            : step.targetKey === 'thrusters'
              ? '1,0'
              : step.targetKey === 'booster'
                ? '0,0'
                : '2,0';
        toEl = document.querySelector(`[data-slot="${slotKey}"]`);
      } else if (step.targetType === 'slot' && step.targetKey) {
        fromEl = document.querySelector(`[data-slot="${step.targetKey}"]`);
      } else if (step.targetType === 'cmd' && step.targetKey) {
        fromEl = document.querySelector(`[data-add-cmd="${step.targetKey}"]`);
        toEl = document.querySelector('[data-drop-zone="ROOT"]');
      } else if (step.targetType === 'button' && step.targetKey) {
        fromEl = document.getElementById(step.targetKey);
      } else if (step.targetType === 'circuit' && step.circuitTarget) {
        fromEl = document.querySelector(
          `[data-circuit-cell="${step.circuitTarget.r},${step.circuitTarget.c}"]`
        );
      }

      if (!fromEl) {
        setCoords(null);
        return;
      }
      const r1 = fromEl.getBoundingClientRect();
      const fx = r1.left + r1.width / 2;
      const fy = r1.top + r1.height / 2;
      if (toEl) {
        const r2 = toEl.getBoundingClientRect();
        setCoords({ fromX: fx, fromY: fy, toX: r2.left + r2.width / 2, toY: r2.top + r2.height / 2 });
      } else {
        setCoords({ fromX: fx, fromY: fy, toX: fx, toY: fy });
      }
    };

    compute();
    const timer = window.setInterval(compute, 450);
    return () => clearInterval(timer);
  }, [visible, step]);

  if (!visible || !coords) return null;

  const isDrag = Math.hypot(coords.toX - coords.fromX, coords.toY - coords.fromY) > 12;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      <style>{`
        @keyframes ghostGlide {
          0%, 15% { transform: translate(${coords.fromX}px, ${coords.fromY}px) scale(1); opacity: 0.95; }
          65%, 85% { transform: translate(${coords.toX}px, ${coords.toY}px) scale(0.92); opacity: 0.95; }
          100% { transform: translate(${coords.fromX}px, ${coords.fromY}px) scale(1); opacity: 0.4; }
        }
      `}</style>
      <div
        style={{
          animation: isDrag
            ? 'ghostGlide 2.1s ease-in-out infinite'
            : undefined,
          transform: isDrag ? undefined : `translate(${coords.fromX}px, ${coords.fromY}px)`
        }}
        className="fixed left-0 top-0 ml-1 mt-2 drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)]"
      >
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path
            d="M12 6a2.5 2.5 0 0 1 5 0v9h1.5a2.3 2.3 0 0 1 2.3 2.3v.7h1.4a2.3 2.3 0 0 1 2.3 2.3v.7h1.2a2.3 2.3 0 0 1 2.3 2.3V26c0 4.4-3.6 8-8 8h-3.6c-2.6 0-5-1.2-6.5-3.3L6.8 26a2.3 2.3 0 0 1 3.7-2.7l1.5 1.8V6Z"
            fill="#fbbf24"
            stroke="#0f172a"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};
