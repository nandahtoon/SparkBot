import type { CodeBlock, SensorCondition } from './engine';
import { collectAncestorBlockIds } from './engine';
import type { BotMood } from '../three/robotRig';
import type { RobotEmoteKind, RobotVoiceMood, WallEPhraseId } from './robotVoice';

export type CodeComplexityTier = 'simple' | 'dynamic' | 'loop' | 'conditional' | 'nested';

export interface CodeBlockFeedback {
  tier: CodeComplexityTier;
  /** Uses the robot's existing BotMood state machine */
  mood: BotMood;
  /** Animation duration in seconds */
  duration: number;
  /** Primary 3D sparkle hex color */
  sparkColorHex: number;
  /** Secondary pastel 3D puff hex color */
  puffColorHex: number;
  /** Number of 3D sparkles spawned */
  sparkCount: number;
  /** Number of soft 3D puffs spawned */
  puffCount: number;
  /** Optional WALL-E vocal reaction for higher-complexity blocks */
  voicePhrase: WallEPhraseId | null;
  voiceMood: RobotVoiceMood;
  voiceEmote: RobotEmoteKind;
  voiceSyllables: number;
  voiceAriaLabel: string;
  accentCss: string;
}

/**
 * Computes how deeply nested a block is inside LOOP / IF containers (0 = root level).
 */
export function computeBlockNestingDepth(program: CodeBlock[], blockId: string | null): number {
  if (!blockId || !Array.isArray(program)) return 0;
  return collectAncestorBlockIds(program, blockId).length;
}

/**
 * Maps a placed code block and its nesting depth to a context-specific 3D animation
 * profile backed by the robot's existing BotMood state logic.
 */
export function classifyCodeBlockFeedback(
  blockType: CodeBlock['type'],
  nestingDepth: number,
  condition?: SensorCondition
): CodeBlockFeedback {
  const depth = Math.max(0, Math.floor(nestingDepth));

  // Nested logic (placing any instruction or nested control block inside LOOP / IF)
  if (depth >= 1) {
    const isDeepCompound = depth >= 2 || blockType === 'IF' || blockType === 'LOOP';
    return {
      tier: 'nested',
      mood: 'happy',
      duration: isDeepCompound ? 1.65 : 1.35,
      sparkColorHex: isDeepCompound ? 0x34d399 : 0xfde047,
      puffColorHex: isDeepCompound ? 0xa7f3d0 : 0xfef08a,
      sparkCount: isDeepCompound ? 18 : 12,
      puffCount: isDeepCompound ? 6 : 4,
      voicePhrase: isDeepCompound ? 'celebrate' : 'proud',
      voiceMood: isDeepCompound ? 'excited' : 'proud',
      voiceEmote: isDeepCompound ? 'celebrate' : 'stars',
      voiceSyllables: isDeepCompound ? 3 : 2,
      voiceAriaLabel: 'Robot celebrates nested code logic',
      accentCss: isDeepCompound ? '#34d399' : '#fbbf24'
    };
  }

  // Conditional sensor logic: IF [GAP / MUD / RAMP]
  if (blockType === 'IF') {
    const condColor =
      condition === 'MUD' ? 0xf59e0b : condition === 'RAMP' ? 0xf472b6 : 0x22d3ee;
    const condCss =
      condition === 'MUD' ? '#f59e0b' : condition === 'RAMP' ? '#f472b6' : '#22d3ee';
    return {
      tier: 'conditional',
      mood: 'scan',
      duration: 1.25,
      sparkColorHex: condColor,
      puffColorHex: 0xddd6fe,
      sparkCount: 10,
      puffCount: 4,
      voicePhrase: 'curious',
      voiceMood: 'playful',
      voiceEmote: 'curious',
      voiceSyllables: 2,
      voiceAriaLabel: 'Robot scans sensor condition',
      accentCss: condCss
    };
  }

  // Iterative loop container: LOOP 2x/3x/4x
  if (blockType === 'LOOP') {
    return {
      tier: 'loop',
      mood: 'happy',
      duration: 1.2,
      sparkColorHex: 0xfbbf24,
      puffColorHex: 0xfef08a,
      sparkCount: 12,
      puffCount: 4,
      voicePhrase: 'giggle',
      voiceMood: 'playful',
      voiceEmote: 'stars',
      voiceSyllables: 3,
      voiceAriaLabel: 'Robot twirls for loop block',
      accentCss: '#fbbf24'
    };
  }

  // Dynamic motion blocks: JUMP or BOOST
  if (blockType === 'JUMP' || blockType === 'BOOST') {
    const isBoost = blockType === 'BOOST';
    return {
      tier: 'dynamic',
      mood: isBoost ? 'boost' : 'happy',
      duration: 0.92,
      sparkColorHex: isBoost ? 0xf472b6 : 0xfb923c,
      puffColorHex: isBoost ? 0xfbcfe8 : 0xfed7aa,
      sparkCount: 10,
      puffCount: 3,
      voicePhrase: null,
      voiceMood: 'excited',
      voiceEmote: 'notes',
      voiceSyllables: 2,
      voiceAriaLabel: 'Robot revs dynamic action block',
      accentCss: isBoost ? '#f472b6' : '#fb923c'
    };
  }

  // Simple sequential motion: MOVE
  return {
    tier: 'simple',
    mood: 'happy',
    duration: 0.72,
    sparkColorHex: 0x38bdf8,
    puffColorHex: 0xbae6fd,
    sparkCount: 6,
    puffCount: 0,
    voicePhrase: null,
    voiceMood: 'happy',
    voiceEmote: 'notes',
    voiceSyllables: 1,
    voiceAriaLabel: 'Robot nods for move block',
    accentCss: '#38bdf8'
  };
}
