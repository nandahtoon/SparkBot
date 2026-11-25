import { useEffect, type MutableRefObject } from 'react';
import { SFX } from '../game/audio';
import type { LevelDef } from '../game/engine';
import type { UnifiedWorldController, WorldMode } from '../three/worldScene';

interface UseKeyboardShortcutsOptions {
  mode: WorldMode;
  paused: boolean;
  showMap: boolean;
  showProfile: boolean;
  showSettings: boolean;
  showGameRoom: boolean;
  showParentDashboard: boolean;
  showSandbox: boolean;
  showClassCode: boolean;
  currentLevel: LevelDef;
  worldRef: MutableRefObject<UnifiedWorldController | null>;
  planetKeysRef: MutableRefObject<Set<string>>;
  beginLevel: (lvl: LevelDef, preserveChassis?: boolean) => void;
  setShowParentDashboard: (v: boolean) => void;
  setShowSandbox: (v: boolean) => void;
  setShowClassCode: (v: boolean) => void;
  setShowGameRoom: (v: boolean) => void;
  setShowProfile: (v: boolean) => void;
  setShowSettings: (v: boolean) => void;
  setShowMap: (v: boolean) => void;
  setWorkshopAutoSpin: (v: boolean) => void;
  setMode: (m: WorldMode) => void;
  setPaused: (updater: (prev: boolean) => boolean) => void;
  onUndoCode?: () => void;
  onRedoCode?: () => void;
}

export function useKeyboardShortcuts(opts: UseKeyboardShortcutsOptions): void {
  const {
    mode,
    paused,
    showMap,
    showProfile,
    showSettings,
    showGameRoom,
    showParentDashboard,
    showSandbox,
    showClassCode,
    currentLevel,
    worldRef,
    planetKeysRef,
    beginLevel,
    setShowParentDashboard,
    setShowSandbox,
    setShowClassCode,
    setShowGameRoom,
    setShowProfile,
    setShowSettings,
    setShowMap,
    setWorkshopAutoSpin,
    setMode,
    setPaused,
    onUndoCode,
    onRedoCode
  } = opts;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') target.blur();
        return;
      }

      if (showClassCode) {
        if (e.key === 'Escape') setShowClassCode(false);
        return;
      }
      if (showSandbox) {
        if (e.key === 'Escape') setShowSandbox(false);
        return;
      }
      if (showParentDashboard) {
        if (e.key === 'Escape') setShowParentDashboard(false);
        return;
      }
      if (showGameRoom) {
        if (e.key === 'Escape') setShowGameRoom(false);
        return;
      }
      if (showProfile) {
        if (e.key === 'Escape') setShowProfile(false);
        return;
      }
      if (showSettings) {
        if (e.key === 'Escape') setShowSettings(false);
        return;
      }

      if (mode === 'TITLE' && !showMap) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          SFX.click();
          beginLevel(currentLevel);
        }
        return;
      }

      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (showMap) {
          setShowMap(false);
        } else if (mode === 'PAINT_BOOTH' && e.key === 'Escape') {
          setWorkshopAutoSpin(false);
          worldRef.current?.setWorkshopAutoSpin(false);
          setMode('BUILD_3D');
          worldRef.current?.setMode('BUILD_3D');
        } else if (mode !== 'TITLE' && mode !== 'VICTORY') {
          setPaused((p) => !p);
        }
        return;
      }

      if (mode === 'CODE_3D' && !paused && !showMap && (e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) {
          e.preventDefault();
          onUndoCode?.();
          return;
        }
        if ((k === 'z' && e.shiftKey) || k === 'y') {
          e.preventDefault();
          onRedoCode?.();
          return;
        }
      }

      if (mode === 'ACTION_RUN_3D' && !paused) {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
          e.preventDefault();
          worldRef.current?.steerActionDash(-1);
        } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
          e.preventDefault();
          worldRef.current?.steerActionDash(1);
        } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
          e.preventDefault();
          worldRef.current?.jumpActionDash();
        }
      }

      if (mode === 'PLANET_ADVENTURE_3D' && !paused) {
        const k = e.key.toLowerCase();
        if (
          k === 'w' ||
          k === 's' ||
          k === 'a' ||
          k === 'd' ||
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight'
        ) {
          e.preventDefault();
          planetKeysRef.current.add(k === e.key.toLowerCase() ? k : e.key);
          const keys = planetKeysRef.current;
          const forward =
            (keys.has('w') || keys.has('ArrowUp') ? 1 : 0) -
            (keys.has('s') || keys.has('ArrowDown') ? 1 : 0);
          const strafe =
            (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) -
            (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0);
          worldRef.current?.setPlanetMoveInput(forward, strafe);
        } else if (e.key === ' ') {
          e.preventDefault();
          worldRef.current?.jumpPlanetAdventure();
        } else if (e.key === 'Shift') {
          e.preventDefault();
          worldRef.current?.triggerPlanetBoost();
        } else if (k === 'e' || k === 'f') {
          e.preventDefault();
          worldRef.current?.firePlanetLaser();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (mode !== 'PLANET_ADVENTURE_3D') return;
      const k = e.key.toLowerCase();
      planetKeysRef.current.delete(k === e.key.toLowerCase() ? k : e.key);
      const keys = planetKeysRef.current;
      const forward =
        (keys.has('w') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('s') || keys.has('ArrowDown') ? 1 : 0);
      const strafe =
        (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0);
      worldRef.current?.setPlanetMoveInput(forward, strafe);
    };

    const onBlur = () => {
      planetKeysRef.current.clear();
      worldRef.current?.setPlanetMoveInput(0, 0);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    beginLevel,
    currentLevel,
    mode,
    paused,
    planetKeysRef,
    setMode,
    setPaused,
    setShowClassCode,
    setShowGameRoom,
    setShowMap,
    setShowParentDashboard,
    setShowProfile,
    setShowSandbox,
    setShowSettings,
    setWorkshopAutoSpin,
    showClassCode,
    showGameRoom,
    showMap,
    showParentDashboard,
    showProfile,
    showSandbox,
    showSettings,
    worldRef,
    onUndoCode,
    onRedoCode
  ]);
}
