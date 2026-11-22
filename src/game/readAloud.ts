import { useSyncExternalStore } from 'react';

export interface ReadAloudState {
  supported: boolean;
  enabled: boolean;
  speaking: boolean;
  activeId: string | null;
}

type Listener = () => void;

function hasSpeechSupport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0.8;
  return Math.max(0, Math.min(1, v));
}

function pickKidFriendlyVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  const english = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
  const pool = english.length > 0 ? english : voices;
  const preferredNames = ['samantha', 'karen', 'victoria', 'aria', 'jenny', 'natural', 'google us english'];
  for (const needle of preferredNames) {
    const found = pool.find((v) => v.name.toLowerCase().includes(needle));
    if (found) return found;
  }
  return pool[0] || null;
}

class ReadAloudController {
  private enabled = false;
  private muted = false;
  private voiceVolume = 0.85;
  private speaking = false;
  private activeId: string | null = null;
  private listeners = new Set<Listener>();
  private snapshot: ReadAloudState;

  constructor() {
    this.snapshot = {
      supported: hasSpeechSupport(),
      enabled: this.enabled,
      speaking: this.speaking,
      activeId: this.activeId
    };
  }

  private emit(): void {
    this.snapshot = {
      supported: hasSpeechSupport(),
      enabled: this.enabled,
      speaking: this.speaking,
      activeId: this.activeId
    };
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // ignore listener errors
      }
    });
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): ReadAloudState => {
    return this.snapshot;
  };

  isSupported(): boolean {
    return hasSpeechSupport();
  }

  setEnabled(next: boolean): void {
    const boolNext = Boolean(next);
    if (this.enabled === boolNext) return;
    this.enabled = boolNext;
    if (!boolNext) {
      this.stop();
    } else {
      this.emit();
    }
  }

  applySettings(muted: boolean, voiceVolume: number): void {
    this.muted = Boolean(muted);
    this.voiceVolume = clamp01(voiceVolume);
    if (this.muted || this.voiceVolume <= 0.01) {
      this.stop();
    }
  }

  speak(rawText: string, id = 'default'): boolean {
    const cleaned = String(rawText || '')
      .replace(/[➔→]/g, ' to ')
      .replace(/[^\S\r\n]+/g, ' ')
      .trim()
      .slice(0, 420);

    if (!cleaned || this.muted || this.voiceVolume <= 0.01 || !hasSpeechSupport()) {
      return false;
    }

    try {
      const synth = window.speechSynthesis;
      synth.cancel();

      const utter = new SpeechSynthesisUtterance(cleaned);
      const voice = pickKidFriendlyVoice(synth.getVoices());
      if (voice) utter.voice = voice;
      utter.rate = 0.94;
      utter.pitch = 1.05;
      utter.volume = this.voiceVolume;

      this.speaking = true;
      this.activeId = id;
      this.emit();

      const clearIfActive = () => {
        if (this.activeId === id) {
          this.speaking = false;
          this.activeId = null;
          this.emit();
        }
      };
      utter.onend = clearIfActive;
      utter.onerror = clearIfActive;

      synth.speak(utter);
      return true;
    } catch {
      this.speaking = false;
      this.activeId = null;
      this.emit();
      return false;
    }
  }

  toggleSpeak(rawText: string, id: string): boolean {
    if (this.speaking && this.activeId === id) {
      this.stop();
      return false;
    }
    return this.speak(rawText, id);
  }

  stop(): void {
    if (hasSpeechSupport()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore synthesis cancel issues
      }
    }
    if (this.speaking || this.activeId !== null) {
      this.speaking = false;
      this.activeId = null;
      this.emit();
    }
  }
}

export const SPEECH = new ReadAloudController();

export function useReadAloud(): ReadAloudState {
  return useSyncExternalStore(SPEECH.subscribe, SPEECH.getSnapshot, SPEECH.getSnapshot);
}
