import { useEffect, useRef, useState } from 'react';

export function useChallengeTimer(isRunning: boolean) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!isRunning) return;
    let lastTick = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.max(0, Math.min(500, now - lastTick));
      lastTick = now;
      elapsedRef.current += delta;
      setElapsedMs(elapsedRef.current);
    }, 100);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const resetTimer = () => {
    elapsedRef.current = 0;
    setElapsedMs(0);
  };

  return {
    elapsedMs,
    elapsedRef,
    setElapsedMs,
    resetTimer
  };
}
