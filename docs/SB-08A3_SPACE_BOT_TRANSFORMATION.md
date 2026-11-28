# Space Shooter — companion transformation (existing arcade refinement)
Baseline 38ba291f8dca71fb0410e585ff47f6b0917f14fb, exact CI 46180776378 PASS. Owner's earlier direction: SparkBot transforms, not an airplane; progressively advanced Space Shooter. This is an isolated refinement of the existing optional arcade activity, not A4/A5 campaign expansion. Keep the existing 4-wave/35s round, reward math, seven activity IDs and save schema unchanged. No new release gate waiver.

## Implemented increment
Canvas renders the selected companion's head, body, arms, feet, identifying accessories; no triangular plane. Three forms cycle Scout -> Pulse -> Guard using visible button or T. Scout faster keyboard movement and twin beams; Pulse wider three beams with slower interval; Guard lower keyboard speed, larger star pickup and absorbs one collision per six-second shared cooldown. Touch/mouse remain direct positioning; speed distinction on keyboard only for now. Existing turbo burst remains. Transform interpolates over 280ms; reduced motion snaps. Clear keys on blur/visibility, no hidden-tab game progression, resize bullets/sparks with canvas. No new assets or data.

## Advanced progression proposal — NOT implemented
Stage 1–4 familiar round; next optional Expedition path should add a finite 5–8-wave challenge with distinct formation patterns, moving debris, shield timing and a nonviolent rescue finale, explicit retry/exit and balanced short sessions. Later challenges add meaningful form tradeoffs and optional spatial planning rather than just larger HP. Keep original arcade available, no new campaign IDs, no forced grind or timer in learning missions. Separate review for mechanics, progression and physical balancing; do not claim educational gains or acceptance.

## QA
Added pure form, cooldown, geometry, compatibility and source contracts. Exact new CI and physical portrait/landscape, actual touch, keyboard, transformation, reward, collision and reduced-motion retest pending. No browser screenshot or measured FPS. Stable main, integration and pinned family preview preserved; draft #38 only, production HOLD. Roll back to prior verified preview.
