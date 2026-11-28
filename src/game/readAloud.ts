import { useSyncExternalStore } from 'react';
import { characterVoiceStyle,type CharacterVoiceMood } from './characterVoiceStyle';

export interface ReadAloudState {
  supported: boolean;
  enabled: boolean;
  speaking: boolean;
  activeId: string | null;
}

type Listener = () => void;
export interface SpeechStyle { playful?: boolean; mood?:CharacterVoiceMood; onFinished?: () => void; }

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
  private utteranceGeneration = 0;
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

  speak(rawText: string, id = 'default', style: SpeechStyle = {}): boolean {
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
      const generation=++this.utteranceGeneration;
      synth.cancel();

      const utter = new SpeechSynthesisUtterance(cleaned);
      const voices=synth.getVoices();
      const localEnglish=voices.filter(v=>v.localService && /^en(-|_|$)/i.test(v.lang));
      const voice = pickKidFriendlyVoice(style.playful && localEnglish.length ? localEnglish : voices);
      if (voice) utter.voice = voice;
      if(style.playful) utter.lang=voice && /^en(-|_|$)/i.test(voice.lang)?voice.lang:'en-US';
      const profile=characterVoiceStyle(id,style.mood);
      utter.rate = style.playful ? profile.rate : 0.94;
      utter.pitch = style.playful ? profile.pitch : 1.05;
      utter.volume = this.voiceVolume;

      this.speaking = true;
      this.activeId = id;
      this.emit();

      const clearIfActive = (finished:boolean) => {
        if (this.utteranceGeneration === generation && this.activeId === id) {
          this.speaking = false;
          this.activeId = null;
          this.emit();
          if(finished && !this.muted) style.onFinished?.();
        }
      };
      utter.onend = () => clearIfActive(true);
      utter.onerror = () => clearIfActive(false);

      synth.speak(utter);
      return true;
    } catch {
      this.speaking = false;
      this.activeId = null;
      this.emit();
      return false;
    }
  }

  stopOwned(id: string): void {
    if(this.activeId===id)this.stop();
  }

  toggleSpeak(rawText: string, id: string, style: SpeechStyle = {}): boolean {
    if (this.speaking && this.activeId === id) {
      this.stop();
      return false;
    }
    return this.speak(rawText, id, style);
  }

  stop(): void {
    this.utteranceGeneration++;
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
