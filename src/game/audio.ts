import {
  computeAudioOutputGain,
  computeEffectiveChannelGain,
  DEFAULT_AUDIO_SETTINGS,
  MASTER_OUTPUT_BOOST,
  normalizeAudioSettings,
  type AudioChannel,
  type AudioSettings
} from './audioConfig';
import {
  composeWallEPhrase,
  VOWEL_FORMANTS,
  type RobotVoiceMood,
  type WallEPhraseId
} from './robotVoice';
import type { PartId } from './engine';
import { getPartPlacementSoundProfile } from './partAudio';
import { MILESTONE_SOUND_PROFILES, type MilestoneUnlockKind } from './milestoneParticles';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterBus: GainNode | null = null;
  private masterComp: DynamicsCompressorNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private glideNode: AudioBufferSourceNode | null = null;
  private glideGain: GainNode | null = null;
  private activeVoiceNodes: AudioNode[] = [];
  private unlocked = false;
  public muted = false;
  public sfxVolume = DEFAULT_AUDIO_SETTINGS.sfxVolume;
  public uiVolume = DEFAULT_AUDIO_SETTINGS.uiVolume;
  public voiceVolume = DEFAULT_AUDIO_SETTINGS.voiceVolume;

  constructor() {
    this.installGestureUnlocker();
  }

  private installGestureUnlocker() {
    if (typeof window === 'undefined') return;
    const handleUnlock = () => {
      this.unlock();
      if (this.unlocked) {
        window.removeEventListener('pointerdown', handleUnlock, true);
        window.removeEventListener('touchstart', handleUnlock, true);
        window.removeEventListener('click', handleUnlock, true);
        window.removeEventListener('keydown', handleUnlock, true);
      }
    };
    window.addEventListener('pointerdown', handleUnlock, { capture: true, passive: true });
    window.addEventListener('touchstart', handleUnlock, { capture: true, passive: true });
    window.addEventListener('click', handleUnlock, { capture: true, passive: true });
    window.addEventListener('keydown', handleUnlock, { capture: true, passive: true });
  }

  /**
   * Unlocks & primes Web Audio on the first user gesture (required by mobile/Android/Chrome autoplay policies).
   */
  public unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch {
        return;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx
        .resume()
        .then(() => {
          this.unlocked = this.ctx?.state === 'running';
        })
        .catch(() => {});
    }
    try {
      // 1-sample silent buffer pulse unlocks iOS / Android WebView audio immediately
      const silent = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      const src = this.ctx.createBufferSource();
      src.buffer = silent;
      src.connect(this.ctx.destination);
      src.start(0);
      if (this.ctx.state === 'running') {
        this.unlocked = true;
      }
    } catch {
      // Ignore if context cannot accept buffer yet
    }
  }

  public applySettings(muted: boolean, audio?: Partial<AudioSettings> | null) {
    this.muted = Boolean(muted);
    const norm = normalizeAudioSettings(audio);
    this.sfxVolume = norm.sfxVolume;
    this.uiVolume = norm.uiVolume;
    this.voiceVolume = norm.voiceVolume;

    if (this.muted || this.sfxVolume <= 0) {
      if (this.glideGain && this.ctx) {
        this.glideGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.03);
      }
    }
    if (this.muted || this.voiceVolume <= 0) {
      this.cancelSpeech();
    }
  }

  public getChannelGain(channel: AudioChannel): number {
    const raw =
      channel === 'ui'
        ? this.uiVolume
        : channel === 'voice'
          ? this.voiceVolume
          : this.sfxVolume;
    return computeEffectiveChannelGain(this.muted, raw);
  }

  public getChannelOutputGain(channel: AudioChannel): number {
    const raw =
      channel === 'ui'
        ? this.uiVolume
        : channel === 'voice'
          ? this.voiceVolume
          : this.sfxVolume;
    return computeAudioOutputGain(this.muted, channel, raw);
  }

  private ensure(
    channel: AudioChannel
  ): { ctx: AudioContext; out: AudioNode; gainScale: number } | null {
    const gainScale = this.getChannelOutputGain(channel);
    if (gainScale <= 0.001 || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.masterBus && this.ctx) {
      const bus = this.ctx.createGain();
      bus.gain.value = 1.0;

      // Gentle studio dynamics limiter prevents clipping while keeping audio loud & punchy
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-10, this.ctx.currentTime);
      comp.knee.setValueAtTime(14, this.ctx.currentTime);
      comp.ratio.setValueAtTime(5, this.ctx.currentTime);
      comp.attack.setValueAtTime(0.004, this.ctx.currentTime);
      comp.release.setValueAtTime(0.14, this.ctx.currentTime);

      const makeup = this.ctx.createGain();
      makeup.gain.setValueAtTime(MASTER_OUTPUT_BOOST, this.ctx.currentTime);

      bus.connect(comp);
      comp.connect(makeup);
      makeup.connect(this.ctx.destination);
      this.masterBus = bus;
      this.masterComp = comp;
    }
    if (!this.noiseBuf && this.ctx) {
      const len = Math.floor(this.ctx.sampleRate * 0.8);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    return { ctx: this.ctx, out: this.masterBus ?? this.ctx.destination, gainScale };
  }

  /**
   * Executes audio synthesis synchronously when AudioContext is running,
   * or right after `ctx.resume()` resolves if it was suspended so sounds are never dropped.
   */
  private withReadyAudio(
    channel: AudioChannel,
    fn: (env: { ctx: AudioContext; out: AudioNode; gainScale: number }) => void
  ) {
    const env = this.ensure(channel);
    if (!env) return;
    if (env.ctx.state === 'running') {
      fn(env);
      return;
    }
    env.ctx
      .resume()
      .then(() => {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const freshGain = this.getChannelOutputGain(channel);
        if (freshGain <= 0.001) return;
        fn({
          ctx: this.ctx,
          out: this.masterBus ?? this.ctx.destination,
          gainScale: freshGain
        });
      })
      .catch(() => {});
  }

  private noiseBurst(
    channel: AudioChannel,
    dur: number,
    filterFreq: number,
    q: number,
    vol: number,
    delay = 0
  ) {
    this.withReadyAudio(channel, ({ ctx, out, gainScale }) => {
      if (!this.noiseBuf) return;
      const t = ctx.currentTime + delay;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(filterFreq, t);
      filter.Q.setValueAtTime(q, t);
      const gain = ctx.createGain();
      const scaledVol = Math.max(0.0002, vol * gainScale);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(scaledVol, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      src.start(t);
      src.stop(t + dur + 0.02);
    });
  }

  private filteredTone(
    channel: AudioChannel,
    freq: number,
    endFreq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    cutoffHz: number,
    delay = 0
  ) {
    this.withReadyAudio(channel, ({ ctx, out, gainScale }) => {
      const scaledVol = Math.max(0.0002, vol * gainScale);
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const lp = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), t);
      if (endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
      }

      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(cutoffHz, t);
      lp.Q.setValueAtTime(0.8, t);

      const attack = Math.min(0.016, dur * 0.25);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(scaledVol, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    });
  }

  // ---------- UI CHANNEL SOUNDS ----------
  public click() {
    this.filteredTone('ui', 520, 710, 0.05, 'sine', 0.075, 2200);
    this.filteredTone('ui', 820, 1020, 0.038, 'triangle', 0.032, 2400, 0.01);
  }

  public uiTick() {
    this.filteredTone('ui', 650, 840, 0.04, 'sine', 0.058, 2100);
  }

  public orbitNudge() {
    // Subtle Wall-E binocular servo whirr when rotating the bot
    this.filteredTone('ui', 380, 510, 0.055, 'sine', 0.045, 1750);
    this.noiseBurst('ui', 0.025, 2200, 2.2, 0.015, 0);
  }

  public paintSpray() {
    this.noiseBurst('ui', 0.14, 2150, 1.1, 0.052, 0);
    this.filteredTone('ui', 523.25, 783.99, 0.12, 'sine', 0.078, 2400, 0.02);
    this.filteredTone('ui', 783.99, 1046.5, 0.13, 'triangle', 0.05, 2600, 0.07);
  }

  // ---------- SFX CHANNEL SOUNDS ----------
  public magnetSnap() {
    this.filteredTone('sfx', 240, 440, 0.08, 'triangle', 0.105, 1650);
    this.filteredTone('sfx', 587.33, 880, 0.1, 'sine', 0.082, 2400, 0.035);
    this.noiseBurst('sfx', 0.022, 2600, 2.5, 0.022, 0);
  }

  public mechanicRatchet() {
    const clicks = [0, 0.095, 0.19, 0.29, 0.39, 0.49];
    clicks.forEach((d, idx) => {
      const base = 340 + idx * 38;
      this.filteredTone('sfx', base, base * 1.28, 0.045, 'triangle', 0.062, 1700, d);
      this.noiseBurst('sfx', 0.024, 2400, 1.9, 0.028, d);
    });
    this.noiseBurst('sfx', 0.12, 2800, 1.0, 0.035, 0.56);
    this.filteredTone('sfx', 523.25, 783.99, 0.14, 'sine', 0.088, 2200, 0.58);
  }

  public weldSparks() {
    this.noiseBurst('sfx', 0.12, 2700, 1.4, 0.044, 0);
    this.filteredTone('sfx', 680, 1040, 0.08, 'triangle', 0.058, 2200);
    this.filteredTone('sfx', 440, 660, 0.11, 'sine', 0.082, 2000, 0.035);
    this.filteredTone('sfx', 880, 1320, 0.09, 'sine', 0.058, 2600, 0.08);
  }

  /**
   * Warm pulsing electronic hum (two slightly detuned oscillators + optional harmonic)
   * used for electronic/logic modules like Laser Emitter and Magnet Coils.
   */
  private electronicHum(
    baseFreq: number,
    detuneHz: number,
    dur: number,
    vol: number,
    cutoffHz: number,
    delay = 0
  ) {
    this.filteredTone('sfx', baseFreq, baseFreq * 1.015, dur, 'sine', vol, cutoffHz, delay);
    this.filteredTone('sfx', baseFreq + detuneHz, (baseFreq + detuneHz) * 1.015, dur, 'triangle', vol * 0.62, cutoffHz, delay);
    this.filteredTone('sfx', baseFreq * 2, baseFreq * 2.02, dur * 0.85, 'sine', vol * 0.38, cutoffHz * 1.35, delay + 0.015);
  }

  /**
   * Part-specific installation sound tailored to each PartId:
   * - wheels: crisp metallic axle clank + bearing spin-up + rubber thump
   * - treads: heavy cast-iron double clank + deep chassis thud
   * - thrusters: pressurized pneumatic valve hiss + metallic nozzle latch
   * - booster: aerodynamic wing latch + rapid rising turbine spool
   * - laser: sleek electronic capacitor hum + crystalline optical focus sweep
   * - magnet: deep oscillating electromagnetic coil hum + magnetic core lock thump
   */
  public placePart(part: PartId) {
    const profile = getPartPlacementSoundProfile(part);
    switch (part) {
      case 'wheels':
        // Crisp machined bolt clank + rubber tire seat thump + quick bearing spin
        this.noiseBurst('sfx', 0.042, 1950, 4.2, 0.06, 0);
        this.filteredTone('sfx', profile.baseFreqHz, 168, 0.075, 'triangle', 0.115, 1650, 0);
        this.filteredTone('sfx', profile.accentFreqHz, 490, 0.06, 'square', 0.042, 1850, 0.008);
        this.filteredTone('sfx', 142, 68, 0.095, 'sine', 0.125, 680, 0.02);
        this.filteredTone('sfx', 240, 470, 0.14, 'sine', 0.072, 1900, 0.045);
        this.noiseBurst('sfx', 0.09, 2500, 1.8, 0.024, 0.05);
        break;

      case 'treads':
        // Heavy industrial double iron clank + deep weighted chassis thud
        this.noiseBurst('sfx', 0.06, 880, 3.4, 0.075, 0);
        this.filteredTone('sfx', profile.baseFreqHz, 58, 0.13, 'sawtooth', 0.105, 680, 0);
        this.filteredTone('sfx', profile.accentFreqHz, 182, 0.09, 'triangle', 0.095, 1250, 0.01);
        this.noiseBurst('sfx', 0.055, 1180, 3.8, 0.065, 0.072);
        this.filteredTone('sfx', 98, 52, 0.14, 'triangle', 0.125, 580, 0.072);
        this.filteredTone('sfx', 320, 215, 0.08, 'square', 0.036, 1300, 0.08);
        break;

      case 'thrusters':
        // Pressurized pneumatic valve hiss + twin rocket nozzle metallic latch + chamber prime
        this.noiseBurst('sfx', 0.16, 3300, 1.0, 0.068, 0);
        this.noiseBurst('sfx', 0.12, 1650, 1.5, 0.042, 0.015);
        this.filteredTone('sfx', profile.baseFreqHz, 430, 0.09, 'triangle', 0.092, 2100, 0.045);
        this.filteredTone('sfx', profile.accentFreqHz, 520, 0.085, 'sine', 0.084, 2400, 0.052);
        this.filteredTone('sfx', 155, 220, 0.16, 'sine', 0.088, 980, 0.065);
        break;

      case 'booster':
        // Wing latch click + rapid rising high-tech turbine spool + plasma intake whoosh
        this.noiseBurst('sfx', 0.03, 2700, 3.2, 0.048, 0);
        this.filteredTone('sfx', profile.baseFreqHz, 620, 0.065, 'triangle', 0.085, 2200, 0);
        this.filteredTone('sfx', 310, profile.accentFreqHz, 0.23, 'sine', 0.096, 3200, 0.025);
        this.filteredTone('sfx', 465, profile.accentFreqHz * 1.28, 0.2, 'triangle', 0.046, 3000, 0.038);
        this.noiseBurst('sfx', 0.17, 2100, 0.95, 0.052, 0.055);
        break;

      case 'laser':
        // Electronic optical capacitor hum + crystalline lens focus sweep
        this.electronicHum(profile.baseFreqHz * 0.5, 3.6, 0.26, 0.082, 2200, 0);
        this.filteredTone('sfx', profile.baseFreqHz, profile.accentFreqHz, 0.16, 'sine', 0.094, 3400, 0.04);
        this.filteredTone('sfx', 792, 1584, 0.12, 'triangle', 0.044, 3600, 0.085);
        break;

      case 'magnet':
        // Rich low-mid electromagnetic coil hum + inductive shimmer + magnetic lock thump
        this.electronicHum(profile.baseFreqHz, 3.2, 0.3, 0.095, 1450, 0);
        this.filteredTone('sfx', 192, 88, 0.11, 'sine', 0.12, 720, 0.028);
        this.filteredTone('sfx', profile.accentFreqHz, profile.accentFreqHz * 1.18, 0.16, 'sine', 0.068, 2600, 0.065);
        break;
    }
  }

  /**
   * Part-specific secondary installation foley scheduled shortly after placement.
   */
  public placePartFollowUp(part: PartId) {
    switch (part) {
      case 'wheels': {
        // Crisp light axle lug-nut ratchet + quick spark ping
        const clicks = [0, 0.085, 0.17, 0.26];
        clicks.forEach((d, idx) => {
          const base = 390 + idx * 45;
          this.filteredTone('sfx', base, base * 1.24, 0.04, 'triangle', 0.058, 1950, d);
          this.noiseBurst('sfx', 0.02, 2650, 2.2, 0.025, d);
        });
        this.filteredTone('sfx', 587.33, 880, 0.12, 'sine', 0.082, 2400, 0.34);
        break;
      }

      case 'treads': {
        // Heavy hydraulic track-link ratchet + weld spark sizzle
        const clicks = [0, 0.105, 0.21, 0.32];
        clicks.forEach((d, idx) => {
          const base = 230 + idx * 32;
          this.filteredTone('sfx', base, base * 1.18, 0.052, 'sawtooth', 0.052, 1100, d);
          this.noiseBurst('sfx', 0.028, 1450, 2.0, 0.036, d);
        });
        this.noiseBurst('sfx', 0.12, 2500, 1.3, 0.042, 0.36);
        this.filteredTone('sfx', 440, 659.25, 0.13, 'sine', 0.084, 2100, 0.38);
        break;
      }

      case 'thrusters':
        // Pneumatic pressure-seal hiss + rising nozzle test chirp
        this.noiseBurst('sfx', 0.14, 2900, 1.2, 0.054, 0);
        this.filteredTone('sfx', 380, 740, 0.16, 'sine', 0.086, 2400, 0.04);
        this.filteredTone('sfx', 570, 960, 0.12, 'triangle', 0.042, 2600, 0.09);
        break;

      case 'booster':
        // Twin bright turbo-lock harmonic pings + gentle afterburner settle
        this.filteredTone('sfx', 783.99, 1046.5, 0.11, 'sine', 0.088, 3000, 0);
        this.filteredTone('sfx', 1046.5, 1396.91, 0.14, 'sine', 0.084, 3400, 0.085);
        this.noiseBurst('sfx', 0.1, 2400, 1.1, 0.032, 0.04);
        break;

      case 'laser':
        // Precision optical logic-lock calibration triple micro-beep
        [880, 1174.66, 1567.98].forEach((f, idx) => {
          this.filteredTone('sfx', f, f * 1.02, 0.085, 'sine', 0.08, 3600, idx * 0.068);
        });
        break;

      case 'magnet':
        // Warm energized electromagnetic field resonance chord
        [329.63, 493.88, 659.25].forEach((f, idx) => {
          this.filteredTone('sfx', f, f * 1.01, 0.24, 'sine', 0.072, 2200, idx * 0.045);
          this.filteredTone('sfx', f * 0.5, f * 0.505, 0.22, 'triangle', 0.036, 1200, idx * 0.045);
        });
        break;
    }
  }

  public installComplete() {
    // Warm marimba-bell major flourish when installation completes
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.filteredTone('sfx', n, n * 1.015, 0.17, 'sine', 0.095, 2800, idx * 0.065);
      this.filteredTone('sfx', n * 2, n * 2.01, 0.1, 'triangle', 0.028, 3000, idx * 0.065);
    });
  }

  public step() {
    this.filteredTone('sfx', 235, 315, 0.068, 'sine', 0.075, 1400);
    this.noiseBurst('sfx', 0.02, 1600, 2.0, 0.016, 0);
  }

  public jump() {
    this.filteredTone('sfx', 340, 740, 0.15, 'sine', 0.105, 2250);
    this.filteredTone('sfx', 520, 940, 0.11, 'triangle', 0.052, 2400, 0.025);
  }

  public boost() {
    this.filteredTone('sfx', 360, 880, 0.22, 'triangle', 0.092, 1950);
    this.filteredTone('sfx', 540, 1180, 0.2, 'sine', 0.092, 2500, 0.03);
  }

  public sensorScan(matched: boolean) {
    this.filteredTone('sfx', 660, 880, 0.09, 'sine', 0.078, 2400);
    if (matched) {
      this.filteredTone('sfx', 880, 1174.66, 0.11, 'sine', 0.088, 2600, 0.065);
    } else {
      this.filteredTone('sfx', 480, 415, 0.08, 'sine', 0.058, 1800, 0.065);
    }
  }

  public crystal() {
    this.filteredTone('sfx', 880, 1174.66, 0.12, 'sine', 0.095, 3000);
    this.filteredTone('sfx', 1174.66, 1567.98, 0.14, 'sine', 0.078, 3200, 0.05);
  }

  public mirror() {
    this.filteredTone('sfx', 523.25, 783.99, 0.08, 'sine', 0.082, 2400);
  }

  public laserSolved() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, idx) => {
      this.filteredTone('sfx', f, f * 1.01, 0.22, 'sine', 0.105, 3000, idx * 0.075);
      this.filteredTone('sfx', f * 1.5, f * 1.51, 0.12, 'triangle', 0.03, 3200, idx * 0.075);
    });
  }

  public compactCrunch() {
    this.filteredTone('sfx', 190, 96, 0.13, 'triangle', 0.098, 1100);
    this.filteredTone('sfx', 783.99, 1174.66, 0.15, 'sine', 0.088, 2600, 0.09);
  }

  public magAttach() {
    this.filteredTone('sfx', 180, 110, 0.09, 'triangle', 0.09, 1200);
    this.filteredTone('sfx', 360, 620, 0.12, 'sine', 0.082, 2200, 0.02);
  }

  // ---------- PURE WALL-E FORMANT ROBOT VOICE ENGINE (ZERO HUMAN TTS) ----------
  public cancelSpeech() {
    const nodes = this.activeVoiceNodes;
    this.activeVoiceNodes = [];
    for (const node of nodes) {
      try {
        if ('gain' in node && node instanceof GainNode && this.ctx) {
          node.gain.cancelScheduledValues(this.ctx.currentTime);
          node.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.015);
        }
      } catch {}
    }
  }

  /**
   * Synthesizes cute, expressive Pixar WALL-E / EVE mechanical-organic vocalizations
   * using dual morphing vowel formant filters (F1/F2), 3-point emotional pitch glides,
   * gentle vocal vibrato, tiny binocular-shutter servo ticks, and a warm studio echo.
   * Zero text-to-speech or human voice APIs are used.
   */
  public speakWallE(phrase: WallEPhraseId = 'greeting', pitchScale = 1.0, variant = 0) {
    this.withReadyAudio('voice', ({ ctx, out, gainScale }) => {
      this.cancelSpeech();

      const syllables = composeWallEPhrase(phrase, pitchScale, variant);
      const now = ctx.currentTime;

      // Master vocal presence bus: warm mid-range vocal boost + gentle lowpass + cute studio echo
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.max(0.0002, 0.72 * gainScale), now);

      const presenceEq = ctx.createBiquadFilter();
      presenceEq.type = 'peaking';
      presenceEq.frequency.setValueAtTime(1150, now);
      presenceEq.Q.setValueAtTime(0.9, now);
      presenceEq.gain.setValueAtTime(4.5, now);

      const warmthLp = ctx.createBiquadFilter();
      warmthLp.type = 'lowpass';
      warmthLp.frequency.setValueAtTime(4400, now);
      warmthLp.Q.setValueAtTime(0.65, now);

      const echoDelay = ctx.createDelay(0.25);
      echoDelay.delayTime.setValueAtTime(0.058, now);
      const echoGain = ctx.createGain();
      echoGain.gain.setValueAtTime(0.16, now);
      const echoLp = ctx.createBiquadFilter();
      echoLp.type = 'lowpass';
      echoLp.frequency.setValueAtTime(2400, now);

      masterGain.connect(presenceEq);
      presenceEq.connect(warmthLp);
      warmthLp.connect(out);
      warmthLp.connect(echoDelay);
      echoDelay.connect(echoLp);
      echoLp.connect(echoGain);
      echoGain.connect(out);

      this.activeVoiceNodes.push(masterGain);

      for (const syl of syllables) {
        const t0 = now + syl.delay;
        const tMid = t0 + syl.dur * 0.48;
        const tEnd = t0 + syl.dur;

        // 1. Tiny WALL-E binocular-shutter / micro-servo onset tick
        if (syl.servoClick && this.noiseBuf) {
          const clickSrc = ctx.createBufferSource();
          clickSrc.buffer = this.noiseBuf;
          const clickBp = ctx.createBiquadFilter();
          clickBp.type = 'bandpass';
          clickBp.frequency.setValueAtTime(2100, t0);
          clickBp.Q.setValueAtTime(2.6, t0);
          const clickGain = ctx.createGain();
          clickGain.gain.setValueAtTime(0.0001, t0);
          clickGain.gain.linearRampToValueAtTime(0.11, t0 + 0.004);
          clickGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);
          clickSrc.connect(clickBp);
          clickBp.connect(clickGain);
          clickGain.connect(masterGain);
          clickSrc.start(t0);
          clickSrc.stop(t0 + 0.026);
        }

        // 2. Expressive vocal core (clear sine/triangle pitch melody + harmonic sawtooth reed for vowel formants)
        const oscCore = ctx.createOscillator();
        const oscWarm = ctx.createOscillator();
        const oscReed = ctx.createOscillator();
        const coreMix = ctx.createGain();
        const reedSource = ctx.createGain();

        oscCore.type = 'sine';
        oscWarm.type = 'triangle';
        oscReed.type = 'sawtooth';

        const f0 = Math.max(95, syl.fStart);
        const fm = Math.max(95, syl.fMid);
        const f1 = Math.max(95, syl.fEnd);
        for (const osc of [oscCore, oscWarm, oscReed]) {
          osc.frequency.setValueAtTime(f0, t0);
          osc.frequency.exponentialRampToValueAtTime(fm, tMid);
          osc.frequency.exponentialRampToValueAtTime(f1, tEnd);
        }

        // Endearing organic WALL-E mechanical vibrato
        const vib = ctx.createOscillator();
        const vibGain = ctx.createGain();
        vib.type = 'sine';
        vib.frequency.setValueAtTime(syl.vibratoHz, t0);
        vibGain.gain.setValueAtTime(fm * syl.vibratoDepth * 1.15, t0);
        vib.connect(vibGain);
        vibGain.connect(oscCore.frequency);
        vibGain.connect(oscWarm.frequency);
        vibGain.connect(oscReed.frequency);

        // Direct melodic core (ensures voice is ALWAYS clear and audible on mobile & laptop speakers)
        const coreLp = ctx.createBiquadFilter();
        coreLp.type = 'lowpass';
        coreLp.frequency.setValueAtTime(2600, t0);
        coreMix.gain.setValueAtTime(0.46, t0);

        const warmCoreGain = ctx.createGain();
        warmCoreGain.gain.setValueAtTime(0.28, t0);
        oscCore.connect(coreMix);
        oscWarm.connect(warmCoreGain);
        warmCoreGain.connect(coreLp);
        coreMix.connect(coreLp);

        // Rich sawtooth reed feeding morphing vowel formant resonators (F1 & F2)
        reedSource.gain.setValueAtTime(0.62, t0);
        oscReed.connect(reedSource);

        if (syl.breathy && syl.breathy > 0 && this.noiseBuf) {
          const airSrc = ctx.createBufferSource();
          airSrc.buffer = this.noiseBuf;
          const airGain = ctx.createGain();
          airGain.gain.setValueAtTime(0.065 * syl.breathy, t0);
          airSrc.connect(airGain);
          airGain.connect(reedSource);
          airSrc.start(t0);
          airSrc.stop(tEnd + 0.03);
        }

        // 3. Dual parallel morphing Formant Filters (F1 & F2) with warm musical Q
        const fromF = VOWEL_FORMANTS[syl.vowelFrom];
        const toF = VOWEL_FORMANTS[syl.vowelTo];

        const f1Filter = ctx.createBiquadFilter();
        f1Filter.type = 'bandpass';
        f1Filter.frequency.setValueAtTime(fromF.f1, t0);
        f1Filter.frequency.exponentialRampToValueAtTime(toF.f1, tEnd);
        f1Filter.Q.setValueAtTime(Math.min(2.4, fromF.q1 * 0.68), t0);

        const f2Filter = ctx.createBiquadFilter();
        f2Filter.type = 'bandpass';
        f2Filter.frequency.setValueAtTime(fromF.f2, t0);
        f2Filter.frequency.exponentialRampToValueAtTime(toF.f2, tEnd);
        f2Filter.Q.setValueAtTime(Math.min(2.8, fromF.q2 * 0.65), t0);

        const f1Gain = ctx.createGain();
        f1Gain.gain.setValueAtTime(0.78, t0);
        const f2Gain = ctx.createGain();
        f2Gain.gain.setValueAtTime(0.64, t0);

        const sylEnv = ctx.createGain();
        const attack = Math.min(0.018, syl.dur * 0.22);
        const releaseStart = Math.max(t0 + attack, tEnd - Math.min(0.045, syl.dur * 0.32));
        sylEnv.gain.setValueAtTime(0.0001, t0);
        sylEnv.gain.linearRampToValueAtTime(1.0, t0 + attack);
        sylEnv.gain.setValueAtTime(0.92, releaseStart);
        sylEnv.gain.exponentialRampToValueAtTime(0.0001, tEnd + 0.015);

        coreLp.connect(sylEnv);
        reedSource.connect(f1Filter);
        reedSource.connect(f2Filter);
        f1Filter.connect(f1Gain);
        f2Filter.connect(f2Gain);
        f1Gain.connect(sylEnv);
        f2Gain.connect(sylEnv);
        sylEnv.connect(masterGain);

        // 4. Cute EVE-style melodic shimmer overtone (+1 octave soft chime)
        if (syl.sparkle) {
          const oscSparkle = ctx.createOscillator();
          const sparkleEnv = ctx.createGain();
          oscSparkle.type = 'sine';
          oscSparkle.frequency.setValueAtTime(f0 * 2, t0);
          oscSparkle.frequency.exponentialRampToValueAtTime(fm * 2, tMid);
          oscSparkle.frequency.exponentialRampToValueAtTime(f1 * 2, tEnd);
          sparkleEnv.gain.setValueAtTime(0.0001, t0);
          sparkleEnv.gain.linearRampToValueAtTime(0.22, t0 + 0.015);
          sparkleEnv.gain.exponentialRampToValueAtTime(0.0001, tEnd);
          oscSparkle.connect(sparkleEnv);
          sparkleEnv.connect(masterGain);
          oscSparkle.start(t0);
          oscSparkle.stop(tEnd + 0.03);
        }

        oscCore.start(t0);
        oscWarm.start(t0);
        oscReed.start(t0);
        vib.start(t0);
        oscCore.stop(tEnd + 0.03);
        oscWarm.stop(tEnd + 0.03);
        oscReed.stop(tEnd + 0.03);
        vib.stop(tEnd + 0.03);
      }
    });
  }

  public chirpHappy() {
    this.speakWallE('celebrate', 1.05, 0);
  }

  public chirpSad() {
    this.speakWallE('sad', 0.96, 0);
  }

  public chirpConfused() {
    this.speakWallE('curious', 1.04, 0);
  }

  public speakDroid(mood: RobotVoiceMood = 'happy', pitchScale = 1.0, variant = 0) {
    const phrase: WallEPhraseId =
      mood === 'playful'
        ? 'giggle'
        : mood === 'excited'
          ? 'excited'
          : mood === 'proud'
            ? 'proud'
            : 'greeting';
    this.speakWallE(phrase, pitchScale, variant);
  }

  public droneChirp(variant = 0) {
    // High-pitched playful Helper Drone chirp (distinct from SparkBot's warmer voice!)
    this.speakWallE(variant % 2 === 0 ? 'giggle' : 'excited', 1.48, variant);
  }

  public shopBuy() {
    this.filteredTone('sfx', 587.33, 740, 0.08, 'triangle', 0.14, 3400, 0);
    this.filteredTone('sfx', 783.99, 987.77, 0.09, 'triangle', 0.15, 3600, 0.075);
    this.filteredTone('sfx', 1174.66, 1318.5, 0.16, 'sine', 0.15, 4200, 0.15);
    this.speakWallE('celebrate', 1.18, 1);
  }

  public questClaim() {
    this.filteredTone('sfx', 523.25, 659.25, 0.08, 'sine', 0.14, 3400, 0);
    this.filteredTone('sfx', 659.25, 783.99, 0.09, 'sine', 0.14, 3600, 0.07);
    this.filteredTone('sfx', 1046.5, 1318.5, 0.18, 'triangle', 0.16, 4200, 0.14);
    this.speakWallE('proud', 1.12, 0);
  }

  public bugSquashed() {
    this.filteredTone('sfx', 440, 587.33, 0.07, 'triangle', 0.14, 3200, 0);
    this.filteredTone('sfx', 659.25, 880, 0.08, 'triangle', 0.15, 3600, 0.07);
    this.filteredTone('sfx', 1174.66, 1567.98, 0.22, 'sine', 0.16, 4400, 0.15);
    this.speakWallE('celebrate', 1.24, 2);
  }

  public setGlide(active: boolean) {
    const gainScale = this.getChannelOutputGain('sfx');
    if (gainScale <= 0.001 || !active) {
      if (this.glideGain && this.ctx) {
        this.glideGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.03);
      }
      return;
    }
    const env = this.ensure('sfx');
    if (!env || !this.noiseBuf) return;
    const { ctx, out } = env;
    if (!this.glideNode) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1700;
      filter.Q.value = 0.85;
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      src.start();
      this.glideNode = src;
      this.glideGain = gain;
    }
    if (this.glideGain) {
      this.glideGain.gain.setTargetAtTime(0.06 * gainScale, ctx.currentTime, 0.04);
    }
  }

  /**
   * Unique celebratory harmonic chime + celesta sparkle + soft shimmer chord
   * played strictly when a new STEM Fact Card or Mastery Badge tier unlocks.
   */
  public milestoneUnlock(kind: MilestoneUnlockKind = 'both') {
    this.withReadyAudio('sfx', ({ ctx, out, gainScale }) => {
      const profile = MILESTONE_SOUND_PROFILES[kind] || MILESTONE_SOUND_PROFILES.both;
      const now = ctx.currentTime;

      // 1. Warm foundational fifth pad to give the unlock chime emotional depth
      for (const [idx, ratio] of [1, 1.5].entries()) {
        const pad = ctx.createOscillator();
        const padGain = ctx.createGain();
        pad.type = 'sine';
        pad.frequency.setValueAtTime(profile.chordRootHz * ratio, now);
        const peak = (idx === 0 ? 0.14 : 0.09) * gainScale;
        padGain.gain.setValueAtTime(0.0001, now);
        padGain.gain.linearRampToValueAtTime(peak, now + 0.05);
        padGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
        pad.connect(padGain);
        padGain.connect(out);
        pad.start(now);
        pad.stop(now + 0.75);
      }

      // 2. Ascending celesta/bell arpeggio with +1 octave crystalline shimmer overtone
      profile.notesHz.forEach((freq, i) => {
        const t = now + i * profile.stepDelaySec;
        const isFinal = i === profile.notesHz.length - 1;
        const dur = isFinal ? 0.48 : 0.24;

        const bell = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bell.type = 'sine';
        bell.frequency.setValueAtTime(freq, t);
        bellGain.gain.setValueAtTime(0.0001, t);
        bellGain.gain.linearRampToValueAtTime((isFinal ? 0.22 : 0.17) * gainScale, t + 0.012);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        bell.connect(bellGain);
        bellGain.connect(out);
        bell.start(t);
        bell.stop(t + dur + 0.02);

        const overtone = ctx.createOscillator();
        const overGain = ctx.createGain();
        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(freq * 2, t);
        overGain.gain.setValueAtTime(0.0001, t);
        overGain.gain.linearRampToValueAtTime((isFinal ? 0.085 : 0.055) * gainScale, t + 0.01);
        overGain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.75);
        overtone.connect(overGain);
        overGain.connect(out);
        overtone.start(t);
        overtone.stop(t + dur);
      });

      // 3. Soft filtered sparkle-dust noise sweep synchronized with the climax note
      if (this.noiseBuf) {
        const shimmerStart = now + Math.max(0, (profile.notesHz.length - 2) * profile.stepDelaySec);
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(profile.shimmerHz * 0.72, shimmerStart);
        filter.frequency.exponentialRampToValueAtTime(profile.shimmerHz * 1.25, shimmerStart + 0.28);
        filter.Q.setValueAtTime(1.4, shimmerStart);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.0001, shimmerStart);
        nGain.gain.linearRampToValueAtTime(0.08 * gainScale, shimmerStart + 0.03);
        nGain.gain.exponentialRampToValueAtTime(0.0001, shimmerStart + 0.34);

        src.connect(filter);
        filter.connect(nGain);
        nGain.connect(out);
        src.start(shimmerStart);
        src.stop(shimmerStart + 0.36);
      }
    });
  }
}

export const SFX = new SoundEngine();
