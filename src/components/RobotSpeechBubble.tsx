import React from 'react';
import { Heart, HelpCircle, Music, Music2, Palette, Sparkles, Star } from 'lucide-react';
import { getEmoteWaveBars, type RobotSpeechEvent } from '../game/robotVoice';
import type { HeadScreenPoint } from '../three/robotRig';
import { PartIcon } from './Icons';

interface RobotSpeechBubbleProps {
  speech: (RobotSpeechEvent & { id: number }) | null;
  headPoint: HeadScreenPoint | null;
}

/**
 * Pure non-verbal WALL-E visual emote bubble (zero text!):
 * Shows animated voice-box soundwave bars, bouncing musical notes,
 * hearts, stars, paint droplets, or attached part icons above the bot.
 */
export const RobotSpeechBubble: React.FC<RobotSpeechBubbleProps> = ({ speech, headPoint }) => {
  if (!speech) return null;

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

  const accentStyle =
    speech.mood === 'playful'
      ? 'border-pink-400/90 shadow-[0_12px_30px_rgba(244,114,182,0.4)]'
      : speech.mood === 'proud'
        ? 'border-amber-300/90 shadow-[0_12px_30px_rgba(251,191,36,0.4)]'
        : speech.mood === 'excited'
          ? 'border-sky-300/90 shadow-[0_12px_30px_rgba(56,189,248,0.4)]'
          : 'border-emerald-300/90 shadow-[0_12px_30px_rgba(52,211,153,0.4)]';

  const barColor =
    speech.accentColor ||
    (speech.mood === 'playful'
      ? '#f472b6'
      : speech.mood === 'proud'
        ? '#fbbf24'
        : speech.mood === 'excited'
          ? '#38bdf8'
          : '#34d399');

  const orbBg =
    speech.mood === 'playful'
      ? 'bg-pink-500/20 text-pink-300 border-pink-400/40'
      : speech.mood === 'proud'
        ? 'bg-amber-400/20 text-amber-300 border-amber-300/40'
        : speech.mood === 'excited'
          ? 'bg-sky-400/20 text-sky-300 border-sky-300/40'
          : 'bg-emerald-400/20 text-emerald-300 border-emerald-300/40';

  const waveBars = getEmoteWaveBars(speech.mood, speech.variant);

  return (
    <div
      id="robotSpeechBubble"
      data-testid="robot-emote-bubble"
      data-emote={speech.emote}
      data-phrase={speech.phrase}
      key={speech.id}
      role="status"
      aria-live="polite"
      aria-label={speech.ariaLabel}
      style={{
        left: `${Math.round(x)}px`,
        top: `${Math.round(y)}px`,
        transform: 'translate(-50%, -100%)'
      }}
      className="pointer-events-none fixed z-30"
    >
      {/* Ambient Floating Musical Note & Sparkle accents above bubble */}
      <div className="pointer-events-none relative">
        <span
          aria-hidden="true"
          className="anim-note-float absolute -left-3 -top-3.5 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.75)]"
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <span
          aria-hidden="true"
          style={{ animationDelay: '0.25s' }}
          className="anim-note-float absolute -right-2.5 -top-4 text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
        >
          <Music className="h-4 w-4" />
        </span>

        {/* Main Cute Non-Verbal Emote Capsule */}
        <div
          className={`anim-pop relative flex items-center gap-3 rounded-3xl border-2 bg-slate-900/95 px-3.5 py-2.5 ${accentStyle}`}
        >
          {/* Left Expressive Visual Emblem */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${orbBg}`}
          >
            {speech.emote === 'part' && speech.partId ? (
              <PartIcon id={speech.partId} className="h-8 w-8 anim-happy" />
            ) : speech.emote === 'hearts' ? (
              <Heart className="h-5 w-5 fill-pink-400 text-pink-300 anim-heart-cute" />
            ) : speech.emote === 'paint' ? (
              <div
                className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/80 shadow-md"
                style={{ backgroundColor: barColor }}
              >
                <Palette className="h-3.5 w-3.5 text-slate-950" />
              </div>
            ) : speech.emote === 'stars' || speech.emote === 'celebrate' ? (
              <Star className="h-5 w-5 fill-amber-300 text-amber-200 anim-heart-cute" />
            ) : speech.emote === 'curious' ? (
              <HelpCircle className="h-5 w-5 text-sky-300 anim-bob" />
            ) : (
              <Music2 className="h-5 w-5 text-emerald-300 anim-note-float" />
            )}
          </div>

          {/* Center Animated WALL-E Voice-Box Soundwave Equalizer */}
          <div
            className="flex h-7 items-end gap-1 px-0.5"
            aria-hidden="true"
          >
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

          {/* Right Complementary Cute Icon */}
          <div className="flex shrink-0 items-center gap-1" aria-hidden="true">
            {speech.emote === 'hearts' ? (
              <Music2 className="h-4 w-4 text-pink-300 anim-note-float" />
            ) : speech.emote === 'stars' || speech.emote === 'celebrate' ? (
              <Heart className="h-4 w-4 fill-pink-400 text-pink-300 anim-heart-cute" />
            ) : (
              <Sparkles className="h-4 w-4 text-amber-300 anim-note-float" />
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
