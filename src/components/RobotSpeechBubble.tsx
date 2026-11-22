import React from 'react';
import { Heart, HelpCircle, Music, Music2, Palette, Sparkles, Star } from 'lucide-react';
import {
  getEmoteWaveBars,
  getRobotMoodEmoji,
  type RobotMoodCue,
  type RobotSpeechEvent
} from '../game/robotVoice';
import type { HeadScreenPoint } from '../three/robotRig';
import { HazardIcon, PartIcon } from './Icons';
import type { MoodCue } from './TopHud';

interface RobotSpeechBubbleProps {
  speech: (RobotSpeechEvent & { id: number }) | null;
  moodCue?: MoodCue | null;
  headPoint: HeadScreenPoint | null;
}

const MOOD_STYLES: Record<
  RobotMoodCue,
  { accent: string; bar: string; orb: string; emojiAnim: string }
> = {
  playful: {
    accent: 'border-pink-400/90 shadow-[0_12px_30px_rgba(244,114,182,0.4)]',
    bar: '#f472b6',
    orb: 'bg-pink-500/20 text-pink-300 border-pink-400/40',
    emojiAnim: 'anim-bob'
  },
  proud: {
    accent: 'border-amber-300/90 shadow-[0_12px_30px_rgba(251,191,36,0.4)]',
    bar: '#fbbf24',
    orb: 'bg-amber-400/20 text-amber-300 border-amber-300/40',
    emojiAnim: 'anim-happy'
  },
  excited: {
    accent: 'border-sky-300/90 shadow-[0_12px_30px_rgba(56,189,248,0.4)]',
    bar: '#38bdf8',
    orb: 'bg-sky-400/20 text-sky-300 border-sky-300/40',
    emojiAnim: 'anim-happy'
  },
  celebrate: {
    accent: 'border-amber-300/90 shadow-[0_12px_30px_rgba(251,191,36,0.45)]',
    bar: '#fbbf24',
    orb: 'bg-amber-400/25 text-amber-200 border-amber-300/50',
    emojiAnim: 'anim-happy'
  },
  curious: {
    accent: 'border-cyan-300/90 shadow-[0_12px_30px_rgba(34,211,238,0.4)]',
    bar: '#22d3ee',
    orb: 'bg-cyan-400/20 text-cyan-200 border-cyan-300/40',
    emojiAnim: 'anim-bob'
  },
  sad: {
    accent: 'border-rose-400/90 shadow-[0_12px_30px_rgba(251,113,133,0.4)]',
    bar: '#fb7185',
    orb: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
    emojiAnim: 'anim-stage-nudge'
  },
  confused: {
    accent: 'border-violet-400/90 shadow-[0_12px_30px_rgba(167,139,250,0.4)]',
    bar: '#a78bfa',
    orb: 'bg-violet-500/20 text-violet-200 border-violet-400/40',
    emojiAnim: 'anim-stage-nudge'
  },
  boost: {
    accent: 'border-fuchsia-400/90 shadow-[0_12px_30px_rgba(232,121,249,0.4)]',
    bar: '#e879f9',
    orb: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/40',
    emojiAnim: 'anim-happy'
  },
  build: {
    accent: 'border-amber-400/90 shadow-[0_12px_30px_rgba(251,191,36,0.4)]',
    bar: '#fbbf24',
    orb: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    emojiAnim: 'anim-bob'
  },
  happy: {
    accent: 'border-emerald-300/90 shadow-[0_12px_30px_rgba(52,211,153,0.4)]',
    bar: '#34d399',
    orb: 'bg-emerald-400/20 text-emerald-300 border-emerald-300/40',
    emojiAnim: 'anim-happy'
  },
  neutral: {
    accent: 'border-emerald-300/90 shadow-[0_12px_30px_rgba(52,211,153,0.4)]',
    bar: '#34d399',
    orb: 'bg-emerald-400/20 text-emerald-300 border-emerald-300/40',
    emojiAnim: 'anim-bob'
  }
};

/**
 * Non-verbal WALL-E visual emote bubble:
 * Shows a dynamic robot mood emoji character, animated voice-box soundwave bars,
 * and contextual icons (parts, hazards, hearts, stars, or paint droplets) above the bot.
 */
export const RobotSpeechBubble: React.FC<RobotSpeechBubbleProps> = ({
  speech,
  moodCue = null,
  headPoint
}) => {
  if (!speech && !moodCue) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;

  const isCompact = vw < 640;
  const rawX = headPoint && headPoint.visible ? headPoint.x : vw * 0.5;
  const rawY = headPoint && headPoint.visible ? headPoint.y - (isCompact ? 24 : 30) : 112;

  const padX = isCompact ? 92 : 110;
  const minTop = isCompact ? 116 : 146;
  const maxBottom = isCompact ? vh - 196 : vh - 235;
  const x = Math.max(padX, Math.min(vw - padX, rawX));
  const y = Math.max(minTop, Math.min(maxBottom, rawY));

  const resolvedMood: RobotMoodCue = speech
    ? speech.phrase === 'curious' || speech.emote === 'curious'
      ? 'curious'
      : speech.phrase === 'celebrate' || speech.emote === 'celebrate'
        ? 'celebrate'
        : speech.phrase === 'sad'
          ? 'sad'
          : speech.mood
    : moodCue!.mood;

  const style = MOOD_STYLES[resolvedMood] || MOOD_STYLES.happy;
  const barColor = (speech && speech.accentColor) || style.bar;
  const moodEmoji = getRobotMoodEmoji(resolvedMood, speech?.phrase, speech?.emote);
  const waveBars = getEmoteWaveBars(resolvedMood, speech?.variant ?? 0);

  const partId = speech?.emote === 'part' ? speech.partId : !speech ? moodCue?.part : undefined;
  const hazard = !speech ? moodCue?.hazard : undefined;
  const isNegativeMood = resolvedMood === 'sad' || resolvedMood === 'confused';
  const isSpeaking = Boolean(speech);
  const bubbleKey = speech ? `speech-${speech.id}` : `cue-${resolvedMood}-${partId || hazard || 'base'}`;
  const ariaLabel = speech ? speech.ariaLabel : moodEmoji.label;

  return (
    <div
      id="robotSpeechBubble"
      data-testid="robot-emote-bubble"
      data-emote={speech?.emote || resolvedMood}
      data-phrase={speech?.phrase || resolvedMood}
      data-mood={resolvedMood}
      data-emoji={moodEmoji.emoji}
      data-speaking={isSpeaking ? 'true' : 'false'}
      key={bubbleKey}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      style={{
        left: `${Math.round(x)}px`,
        top: `${Math.round(y)}px`,
        transform: 'translate(-50%, -100%)'
      }}
      className="pointer-events-none fixed z-30"
    >
      {/* Ambient Floating Accents + Subtle Hover/Bounce Container */}
      <div
        className={`pointer-events-none relative ${
          isSpeaking ? 'anim-speech-bounce' : 'anim-speech-hover'
        }`}
      >
        <span
          aria-hidden="true"
          className={`anim-note-float absolute -left-3 -top-3.5 ${
            isNegativeMood
              ? 'text-violet-300 drop-shadow-[0_0_8px_rgba(167,139,250,0.75)]'
              : 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.75)]'
          }`}
        >
          {isNegativeMood ? <HelpCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
        {!isNegativeMood && (
          <span
            aria-hidden="true"
            style={{ animationDelay: '0.25s' }}
            className="anim-note-float absolute -right-2.5 -top-4 text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
          >
            <Music className="h-4 w-4" />
          </span>
        )}

        {/* Main Cute Non-Verbal Emote Capsule */}
        <div
          className={`anim-pop relative flex items-center gap-3 rounded-3xl border-2 bg-slate-900/95 px-3.5 py-2.5 ${style.accent}`}
        >
          {/* Left Dynamic Robot Emoji Character */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${style.orb}`}
          >
            <span
              data-testid="robot-mood-emoji"
              role="img"
              aria-label={moodEmoji.label}
              className={`select-none text-2xl leading-none ${style.emojiAnim}`}
            >
              {moodEmoji.emoji}
            </span>
          </div>

          {/* Center Animated WALL-E Voice-Box Soundwave Equalizer */}
          <div className="flex h-7 items-end gap-1 px-0.5" aria-hidden="true">
            {waveBars.map((h, idx) => (
              <span
                key={idx}
                className="anim-wave-bar w-1.5 rounded-full"
                style={{
                  height: `${Math.round(h * 26)}px`,
                  backgroundColor: barColor,
                  boxShadow: `0 0 8px ${barColor}99`,
                  animationDelay: `${idx * 85}ms`
                }}
              />
            ))}
          </div>

          {/* Right Contextual Emblem */}
          <div className="flex shrink-0 items-center gap-1" aria-hidden="true">
            {partId ? (
              <PartIcon id={partId} className="h-7 w-7 anim-happy" />
            ) : hazard ? (
              <HazardIcon cond={hazard} className="h-7 w-7 anim-stage-nudge" />
            ) : speech?.emote === 'paint' ? (
              <div
                className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/80 shadow-md"
                style={{ backgroundColor: barColor }}
              >
                <Palette className="h-3 w-3 text-slate-950" />
              </div>
            ) : speech?.emote === 'hearts' ? (
              <Heart className="h-4 w-4 fill-pink-400 text-pink-300 anim-heart-cute" />
            ) : speech?.emote === 'stars' || speech?.emote === 'celebrate' ? (
              <Star className="h-4 w-4 fill-amber-300 text-amber-200 anim-heart-cute" />
            ) : resolvedMood === 'sad' || resolvedMood === 'confused' || resolvedMood === 'curious' ? (
              <HelpCircle className="h-4 w-4 text-violet-300 anim-bob" />
            ) : (
              <Music2 className="h-4 w-4 text-emerald-300 anim-note-float" />
            )}
          </div>

          {/* Bubble Tail */}
          <span
            aria-hidden="true"
            className="absolute -bottom-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-inherit bg-slate-900"
          />
        </div>
      </div>
    </div>
  );
};
