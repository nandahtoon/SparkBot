import type { BotThemeId, PartId } from './engine';

export type RobotTouchZone =
  | 'head'
  | 'body'
  | 'wheels'
  | 'treads'
  | 'thrusters'
  | 'booster'
  | 'laser'
  | 'magnet';

export type RobotVoiceMood = 'happy' | 'excited' | 'playful' | 'proud';

export type RobotMoodCue =
  | RobotVoiceMood
  | 'sad'
  | 'confused'
  | 'curious'
  | 'celebrate'
  | 'boost'
  | 'build'
  | 'neutral';

export type VowelShape = 'oo' | 'aa' | 'ee' | 'oh' | 'uh';

export type WallEPhraseId =
  | 'giggle'
  | 'greeting'
  | 'curious'
  | 'excited'
  | 'proud'
  | 'paint'
  | 'sad'
  | 'celebrate';

export type RobotEmoteKind =
  | 'hearts'
  | 'notes'
  | 'part'
  | 'paint'
  | 'stars'
  | 'celebrate'
  | 'curious';

export interface FormantPair {
  f1: number;
  f2: number;
  q1: number;
  q2: number;
}

/**
 * Warm Pixar/WALL-E mechanical vocal-tract formant resonances (F1, F2).
 * Morphing smoothly between vowel formants gives cute "oo-waa", "ee-oh",
 * "whee!", and "ta-da!" vocal expression without any human voice recording.
 */
export const VOWEL_FORMANTS: Record<VowelShape, FormantPair> = {
  oo: { f1: 350, f2: 860, q1: 3.4, q2: 4.2 },
  oh: { f1: 490, f2: 980, q1: 3.2, q2: 4.0 },
  uh: { f1: 560, f2: 1220, q1: 3.0, q2: 3.8 },
  aa: { f1: 720, f2: 1320, q1: 3.1, q2: 4.1 },
  ee: { f1: 340, f2: 2220, q1: 3.6, q2: 4.8 }
};

export interface WallESyllable {
  delay: number;
  dur: number;
  fStart: number;
  fMid: number;
  fEnd: number;
  vowelFrom: VowelShape;
  vowelTo: VowelShape;
  vibratoHz: number;
  vibratoDepth: number;
  sparkle?: boolean;
  servoClick?: boolean;
  breathy?: number;
}

export interface RobotSpeechEvent {
  phrase: WallEPhraseId;
  variant: number;
  emote: RobotEmoteKind;
  mood: RobotVoiceMood;
  zone?: RobotTouchZone;
  partId?: PartId;
  accentColor?: string;
  pitchScale: number;
  syllables: number;
  ariaLabel: string;
}

const THEME_ACCENT_HEX: Record<BotThemeId, string> = {
  amber: '#fbbf24',
  cobalt: '#38bdf8',
  emerald: '#34d399'
};

const PHRASE_TEMPLATES: Record<WallEPhraseId, WallESyllable[][]> = {
  // Classic adorable WALL-E greetings: "Waa-ee!", "Oo-wah!", "Uh-waa-ee!"
  greeting: [
    [
      {
        delay: 0,
        dur: 0.16,
        fStart: 270,
        fMid: 345,
        fEnd: 310,
        vowelFrom: 'oo',
        vowelTo: 'aa',
        vibratoHz: 6.2,
        vibratoDepth: 0.016,
        servoClick: true,
        breathy: 0.24
      },
      {
        delay: 0.18,
        dur: 0.22,
        fStart: 420,
        fMid: 590,
        fEnd: 650,
        vowelFrom: 'uh',
        vowelTo: 'ee',
        vibratoHz: 7.4,
        vibratoDepth: 0.02,
        sparkle: true,
        breathy: 0.18
      }
    ],
    [
      {
        delay: 0,
        dur: 0.12,
        fStart: 320,
        fMid: 410,
        fEnd: 375,
        vowelFrom: 'oh',
        vowelTo: 'oo',
        vibratoHz: 6.5,
        vibratoDepth: 0.015,
        servoClick: true,
        breathy: 0.2
      },
      {
        delay: 0.14,
        dur: 0.21,
        fStart: 465,
        fMid: 640,
        fEnd: 715,
        vowelFrom: 'oo',
        vowelTo: 'ee',
        vibratoHz: 7.8,
        vibratoDepth: 0.018,
        sparkle: true,
        breathy: 0.16
      }
    ],
    [
      {
        delay: 0,
        dur: 0.09,
        fStart: 350,
        fMid: 430,
        fEnd: 390,
        vowelFrom: 'uh',
        vowelTo: 'oo',
        vibratoHz: 6.0,
        vibratoDepth: 0.012,
        servoClick: true,
        breathy: 0.18
      },
      {
        delay: 0.105,
        dur: 0.11,
        fStart: 440,
        fMid: 540,
        fEnd: 510,
        vowelFrom: 'oo',
        vowelTo: 'aa',
        vibratoHz: 6.8,
        vibratoDepth: 0.016,
        breathy: 0.18
      },
      {
        delay: 0.23,
        dur: 0.18,
        fStart: 560,
        fMid: 685,
        fEnd: 740,
        vowelFrom: 'aa',
        vowelTo: 'ee',
        vibratoHz: 7.5,
        vibratoDepth: 0.018,
        sparkle: true,
        breathy: 0.14
      }
    ]
  ],

  // Playful head-tickle giggles: "Hee-hee-hoo-wee!"
  giggle: [
    [
      {
        delay: 0,
        dur: 0.075,
        fStart: 470,
        fMid: 580,
        fEnd: 520,
        vowelFrom: 'ee',
        vowelTo: 'uh',
        vibratoHz: 8.5,
        vibratoDepth: 0.018,
        servoClick: true,
        breathy: 0.22
      },
      {
        delay: 0.088,
        dur: 0.075,
        fStart: 540,
        fMid: 660,
        fEnd: 600,
        vowelFrom: 'ee',
        vowelTo: 'oh',
        vibratoHz: 9.0,
        vibratoDepth: 0.02,
        breathy: 0.2
      },
      {
        delay: 0.176,
        dur: 0.085,
        fStart: 620,
        fMid: 740,
        fEnd: 675,
        vowelFrom: 'oo',
        vowelTo: 'aa',
        vibratoHz: 8.8,
        vibratoDepth: 0.018,
        breathy: 0.18
      },
      {
        delay: 0.275,
        dur: 0.16,
        fStart: 660,
        fMid: 810,
        fEnd: 880,
        vowelFrom: 'oo',
        vowelTo: 'ee',
        vibratoHz: 8.2,
        vibratoDepth: 0.022,
        sparkle: true,
        breathy: 0.15
      }
    ],
    [
      {
        delay: 0,
        dur: 0.105,
        fStart: 410,
        fMid: 620,
        fEnd: 560,
        vowelFrom: 'oo',
        vowelTo: 'ee',
        vibratoHz: 8.2,
        vibratoDepth: 0.02,
        servoClick: true,
        breathy: 0.22
      },
      {
        delay: 0.12,
        dur: 0.08,
        fStart: 580,
        fMid: 690,
        fEnd: 635,
        vowelFrom: 'ee',
        vowelTo: 'aa',
        vibratoHz: 9.2,
        vibratoDepth: 0.018,
        breathy: 0.18
      },
      {
        delay: 0.215,
        dur: 0.15,
        fStart: 650,
        fMid: 790,
        fEnd: 850,
        vowelFrom: 'oh',
        vowelTo: 'ee',
        vibratoHz: 8.0,
        vibratoDepth: 0.02,
        sparkle: true,
        breathy: 0.15
      }
    ]
  ],

  // Thrilled part reactions: "Wooo-ah! Whee-oop!"
  excited: [
    [
      {
        delay: 0,
        dur: 0.165,
        fStart: 310,
        fMid: 520,
        fEnd: 640,
        vowelFrom: 'oo',
        vowelTo: 'aa',
        vibratoHz: 7.4,
        vibratoDepth: 0.02,
        servoClick: true,
        breathy: 0.22
      },
      {
        delay: 0.18,
        dur: 0.095,
        fStart: 660,
        fMid: 780,
        fEnd: 710,
        vowelFrom: 'ee',
        vowelTo: 'oh',
        vibratoHz: 7.8,
        vibratoDepth: 0.016,
        sparkle: true,
        breathy: 0.16
      },
      {
        delay: 0.285,
        dur: 0.16,
        fStart: 620,
        fMid: 810,
        fEnd: 910,
        vowelFrom: 'oo',
        vowelTo: 'ee',
        vibratoHz: 8.0,
        vibratoDepth: 0.02,
        sparkle: true,
        breathy: 0.15
      }
    ],
    [
      {
        delay: 0,
        dur: 0.11,
        fStart: 420,
        fMid: 580,
        fEnd: 540,
        vowelFrom: 'oo',
        vowelTo: 'ee',
        vibratoHz: 7.2,
        vibratoDepth: 0.018,
        servoClick: true,
        breathy: 0.2
      },
      {
        delay: 0.125,
        dur: 0.11,
        fStart: 560,
        fMid: 710,
        fEnd: 665,
        vowelFrom: 'aa',
        vowelTo: 'ee',
        vibratoHz: 7.8,
        vibratoDepth: 0.018,
        sparkle: true,
        breathy: 0.18
      },
      {
        delay: 0.25,
        dur: 0.17,
        fStart: 690,
        fMid: 860,
        fEnd: 930,
        vowelFrom: 'oh',
        vowelTo: 'ee',
        vibratoHz: 8.4,
        vibratoDepth: 0.022,
        sparkle: true,
        breathy: 0.14
      }
    ]
  ],

  // Triumphant install / profile switch: "Ta-daaa! Oo-ee!"
  proud: [
    [
      {
        delay: 0,
        dur: 0.095,
        fStart: 392,
        fMid: 466,
        fEnd: 440,
        vowelFrom: 'uh',
        vowelTo: 'aa',
        vibratoHz: 6.4,
        vibratoDepth: 0.014,
        servoClick: true,
        breathy: 0.2
      },
      {
        delay: 0.11,
        dur: 0.24,
        fStart: 523.25,
        fMid: 659.25,
        fEnd: 783.99,
        vowelFrom: 'aa',
        vowelTo: 'ee',
        vibratoHz: 7.2,
        vibratoDepth: 0.022,
        sparkle: true,
        breathy: 0.18
      },
      {
        delay: 0.365,
        dur: 0.15,
        fStart: 698.46,
        fMid: 820,
        fEnd: 880,
        vowelFrom: 'oo',
        vowelTo: 'ee',
        vibratoHz: 7.5,
        vibratoDepth: 0.018,
        sparkle: true,
        breathy: 0.14
      }
    ],
    [
      {
        delay: 0,
        dur: 0.12,
        fStart: 360,
        fMid: 480,
        fEnd: 450,
        vowelFrom: 'oo',
        vowelTo: 'aa',
        vibratoHz: 6.6,
        vibratoDepth: 0.016,
        servoClick: true,
        breathy: 0.2
      },
      {
        delay: 0.135,
        dur: 0.13,
        fStart: 523.25,
        fMid: 640,
        fEnd: 620,
        vowelFrom: 'oh',
        vowelTo: 'aa',
        vibratoHz: 7.0,
        vibratoDepth: 0.018,
        breathy: 0.16
      },
      {
        delay: 0.28,
        dur: 0.21,
        fStart: 659.25,
        fMid: 783.99,
        fEnd: 880,
        vowelFrom: 'aa',
        vowelTo: 'ee',
        vibratoHz: 7.6,
        vibratoDepth: 0.02,
        sparkle: true,
        breathy: 0.14
      }
    ]
  ],

  // Shimmering Paint Booth delight: "Ooh-laa-ee!"
  paint: [
    [
      {
        delay: 0,
        dur: 0.11,
        fStart: 440,
        fMid: 523.25,
        fEnd: 493.88,
        vowelFrom: 'oo',
        vowelTo: 'oh',
        vibratoHz: 7.0,
        vibratoDepth: 0.016,
        servoClick: true,
        breathy: 0.22
      },
      {
        delay: 0.125,
        dur: 0.12,
        fStart: 587.33,
        fMid: 659.25,
        fEnd: 640,
        vowelFrom: 'aa',
        vowelTo: 'oh',
        vibratoHz: 7.4,
        vibratoDepth: 0.018,
        sparkle: true,
        breathy: 0.18
      },
      {
        delay: 0.26,
        dur: 0.18,
        fStart: 659.25,
        fMid: 783.99,
        fEnd: 880,
        vowelFrom: 'oh',
        vowelTo: 'ee',
        vibratoHz: 7.8,
        vibratoDepth: 0.02,
        sparkle: true,
        breathy: 0.15
      }
    ],
    [
      {
        delay: 0,
        dur: 0.13,
        fStart: 523.25,
        fMid: 659.25,
        fEnd: 610,
        vowelFrom: 'oo',
        vowelTo: 'ee',
        vibratoHz: 7.6,
        vibratoDepth: 0.018,
        servoClick: true,
        sparkle: true,
        breathy: 0.2
      },
      {
        delay: 0.145,
        dur: 0.17,
        fStart: 640,
        fMid: 783.99,
        fEnd: 840,
        vowelFrom: 'aa',
        vowelTo: 'ee',
        vibratoHz: 8.0,
        vibratoDepth: 0.02,
        sparkle: true,
        breathy: 0.16
      }
    ]
  ],

  // Iconic WALL-E curious head-tilt: "Hmm-bwee?"
  curious: [
    [
      {
        delay: 0,
        dur: 0.13,
        fStart: 320,
        fMid: 295,
        fEnd: 335,
        vowelFrom: 'oh',
        vowelTo: 'uh',
        vibratoHz: 5.5,
        vibratoDepth: 0.016,
        servoClick: true,
        breathy: 0.24
      },
      {
        delay: 0.15,
        dur: 0.2,
        fStart: 360,
        fMid: 470,
        fEnd: 640,
        vowelFrom: 'oo',
        vowelTo: 'ee',
        vibratoHz: 6.8,
        vibratoDepth: 0.02,
        breathy: 0.2
      }
    ],
    [
      {
        delay: 0,
        dur: 0.18,
        fStart: 340,
        fMid: 410,
        fEnd: 575,
        vowelFrom: 'oo',
        vowelTo: 'oh',
        vibratoHz: 6.4,
        vibratoDepth: 0.022,
        servoClick: true,
        breathy: 0.22
      }
    ]
  ],

  // Tender sympathetic sigh: "Awww-ooo..."
  sad: [
    [
      {
        delay: 0,
        dur: 0.21,
        fStart: 430,
        fMid: 375,
        fEnd: 300,
        vowelFrom: 'aa',
        vowelTo: 'oh',
        vibratoHz: 5.2,
        vibratoDepth: 0.018,
        breathy: 0.26
      },
      {
        delay: 0.23,
        dur: 0.27,
        fStart: 295,
        fMid: 250,
        fEnd: 205,
        vowelFrom: 'oh',
        vowelTo: 'oo',
        vibratoHz: 4.8,
        vibratoDepth: 0.022,
        breathy: 0.28
      }
    ]
  ],

  // Big joyful celebration dance: "Wee-hoo-waa-ee!"
  celebrate: [
    [
      {
        delay: 0,
        dur: 0.1,
        fStart: 480,
        fMid: 587.33,
        fEnd: 540,
        vowelFrom: 'oo',
        vowelTo: 'ee',
        vibratoHz: 7.5,
        vibratoDepth: 0.018,
        servoClick: true,
        sparkle: true,
        breathy: 0.18
      },
      {
        delay: 0.115,
        dur: 0.11,
        fStart: 587.33,
        fMid: 698.46,
        fEnd: 659.25,
        vowelFrom: 'oh',
        vowelTo: 'aa',
        vibratoHz: 7.8,
        vibratoDepth: 0.018,
        breathy: 0.18
      },
      {
        delay: 0.24,
        dur: 0.12,
        fStart: 659.25,
        fMid: 783.99,
        fEnd: 740,
        vowelFrom: 'oo',
        vowelTo: 'aa',
        vibratoHz: 8.0,
        vibratoDepth: 0.02,
        sparkle: true,
        breathy: 0.16
      },
      {
        delay: 0.375,
        dur: 0.22,
        fStart: 783.99,
        fMid: 932.33,
        fEnd: 1046.5,
        vowelFrom: 'aa',
        vowelTo: 'ee',
        vibratoHz: 8.4,
        vibratoDepth: 0.024,
        sparkle: true,
        breathy: 0.14
      }
    ]
  ]
};

/**
 * Pure composer returning the timed WALL-E vocal syllable sequence
 * scaled safely by character pitch and variant index.
 */
export function composeWallEPhrase(
  phrase: WallEPhraseId,
  pitchScale = 1.0,
  variant = 0
): WallESyllable[] {
  const pool = PHRASE_TEMPLATES[phrase] || PHRASE_TEMPLATES.greeting;
  const idx = Math.abs(Math.floor(variant)) % pool.length;
  const safePitch = Number.isFinite(pitchScale)
    ? Math.max(0.84, Math.min(1.28, pitchScale))
    : 1.0;

  return pool[idx].map((s) => ({
    ...s,
    fStart: Math.round(s.fStart * safePitch * 10) / 10,
    fMid: Math.round(s.fMid * safePitch * 10) / 10,
    fEnd: Math.round(s.fEnd * safePitch * 10) / 10
  }));
}

export interface RobotMoodEmojiInfo {
  emoji: string;
  label: string;
}

/**
 * Maps game-engine mood cues and vocal phrases to distinct robot expression emoji characters.
 */
export function getRobotMoodEmoji(
  mood: RobotMoodCue,
  phrase?: WallEPhraseId,
  emote?: RobotEmoteKind
): RobotMoodEmojiInfo {
  if (mood === 'sad' || phrase === 'sad') {
    return { emoji: '😢', label: 'Sad robot' };
  }
  if (mood === 'confused') {
    return { emoji: '🤔', label: 'Confused robot' };
  }
  if (mood === 'curious' || phrase === 'curious' || emote === 'curious') {
    return { emoji: '🧐', label: 'Curious robot' };
  }
  if (mood === 'celebrate' || phrase === 'celebrate' || emote === 'celebrate') {
    return { emoji: '🥳', label: 'Celebrating robot' };
  }
  if (mood === 'boost') {
    return { emoji: '🚀', label: 'Turbo boost robot' };
  }
  if (mood === 'build') {
    return { emoji: '🦾', label: 'Builder robot' };
  }
  if (mood === 'playful') {
    return { emoji: '😜', label: 'Playful robot' };
  }
  if (mood === 'excited') {
    return { emoji: '🤩', label: 'Excited robot' };
  }
  if (mood === 'proud') {
    return { emoji: '😎', label: 'Proud robot' };
  }
  if (phrase === 'greeting' || mood === 'neutral') {
    return { emoji: '🤖', label: 'Friendly robot' };
  }
  return { emoji: '😄', label: 'Happy robot' };
}

/**
 * Pure helper generating 5 normalized equalizer heights (0.3..1.0)
 * for the non-verbal visual voice wave bubble.
 */
export function getEmoteWaveBars(mood: RobotMoodCue, variant = 0): number[] {
  const base: Record<RobotMoodCue, number[]> = {
    playful: [0.55, 0.95, 0.65, 1.0, 0.5],
    excited: [0.65, 0.85, 1.0, 0.9, 0.7],
    proud: [0.45, 0.75, 0.95, 0.85, 0.6],
    happy: [0.5, 0.85, 0.95, 0.75, 0.55],
    celebrate: [0.7, 1.0, 0.8, 1.0, 0.65],
    curious: [0.45, 0.72, 0.42, 0.86, 0.52],
    confused: [0.4, 0.68, 0.35, 0.75, 0.45],
    sad: [0.35, 0.48, 0.38, 0.34, 0.3],
    boost: [0.75, 0.92, 1.0, 0.95, 0.8],
    build: [0.5, 0.8, 0.7, 0.9, 0.6],
    neutral: [0.45, 0.65, 0.75, 0.65, 0.45]
  };
  const arr = base[mood] || base.happy;
  const shift = Math.abs(Math.floor(variant)) % arr.length;
  return arr.map((_, i) => arr[(i + shift) % arr.length]);
}

export function pickTouchResponse(zone: RobotTouchZone, counter: number): RobotSpeechEvent {
  const idx = Math.abs(Math.floor(counter));
  if (zone === 'head') {
    return {
      phrase: 'giggle',
      variant: idx,
      emote: 'hearts',
      mood: 'playful',
      zone,
      pitchScale: 1.14,
      syllables: 4,
      ariaLabel: 'Robot giggles happily'
    };
  }
  if (zone === 'body') {
    return {
      phrase: 'greeting',
      variant: idx,
      emote: 'notes',
      mood: 'happy',
      zone,
      pitchScale: 1.02,
      syllables: 3,
      ariaLabel: 'Robot chirps a friendly hello'
    };
  }
  return {
    phrase: 'excited',
    variant: idx,
    emote: 'part',
    mood: 'excited',
    zone,
    partId: zone,
    pitchScale: 1.08,
    syllables: 3,
    ariaLabel: `Robot chirps excitedly about ${zone}`
  };
}

export function pickInstallResponse(part: PartId, installedCount: number): RobotSpeechEvent {
  const idx = Math.abs(Math.floor(installedCount));
  return {
    phrase: 'proud',
    variant: idx,
    emote: 'part',
    mood: 'proud',
    partId: part,
    pitchScale: 1.1,
    syllables: 3,
    ariaLabel: `Robot celebrates installing ${part}`
  };
}

export function pickPaintResponse(theme: BotThemeId, counter: number): RobotSpeechEvent {
  const idx = Math.abs(Math.floor(counter));
  return {
    phrase: 'paint',
    variant: idx,
    emote: 'paint',
    mood: 'happy',
    accentColor: THEME_ACCENT_HEX[theme],
    pitchScale: 1.08,
    syllables: 3,
    ariaLabel: `Robot admires ${theme} paint`
  };
}

export function pickCustomPaintResponse(
  _partLabel: string,
  _decalLabel: string,
  counter: number,
  accentColor?: string
): RobotSpeechEvent {
  const idx = Math.abs(Math.floor(counter));
  return {
    phrase: 'paint',
    variant: idx,
    emote: 'paint',
    mood: 'excited',
    accentColor,
    pitchScale: 1.11,
    syllables: 3,
    ariaLabel: 'Robot chirps joyfully at custom paint'
  };
}

export function pickCharacterSwitchResponse(
  _greeting: string,
  voicePitch = 1.08,
  accentColor?: string
): RobotSpeechEvent {
  return {
    phrase: 'greeting',
    variant: 0,
    emote: 'stars',
    mood: 'proud',
    accentColor,
    pitchScale: voicePitch,
    syllables: 3,
    ariaLabel: 'Robot character chimes hello'
  };
}

export function pickThemeSaveResponse(voicePitch = 1.08, accentColor?: string): RobotSpeechEvent {
  return {
    phrase: 'proud',
    variant: 1,
    emote: 'stars',
    mood: 'proud',
    accentColor,
    pitchScale: voicePitch,
    syllables: 3,
    ariaLabel: 'Robot celebrates saving paint theme'
  };
}

export function pickThemeEquipResponse(voicePitch = 1.08, accentColor?: string): RobotSpeechEvent {
  return {
    phrase: 'paint',
    variant: 0,
    emote: 'paint',
    mood: 'happy',
    accentColor,
    pitchScale: voicePitch,
    syllables: 3,
    ariaLabel: 'Robot celebrates equipping paint theme'
  };
}
