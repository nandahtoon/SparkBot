# V0.3.1 RC1 — Living Adventure Edition
Scope: Family preview only. Consolidates PRs #15–22 on stable V0.3 main 7028aaa5aab718aff4cdbcfaea6cc4d11818ff33. Predecessor 7c793ab7f3d5911e49326c89dc0247910dcc3324 exact CI 46099359027 succeeded, 190/190 tests, no failures/skips. Candidate changes only title label, matching test and this checklist. Six chapters, 24 campaign missions, three practice challenges and seven existing Game Room activities. No Chapter 7, new campaign physics, free walking or continuous streamed world. No commercial/native promotion.

## Family acceptance
1. Launch, Learn to Play, and visual prediction: use shapes and speaker to answer without reading, or Run to skip. Correct and incorrect feedback encouraging; no answer leak from trajectory.
2. Voice: tutorial, build, mission, hints and victory. Replay, mute, volume and cancellation; no conflicting narration. Speech support and offline voice depend on device/installed voice.
3. Music: listen in workshop, ocean and clubhouse; distinct motifs, environment textures; independent sliders; music ducks while robot speaks and resumes afterward. Pause and hidden tab stop audio bed.
4. Worlds: sample each of six biome styles, especially missions 21–24. Compare route readability and landmark differentiation. No clipping or obstructed crystals. Legacy mission routes and optics intact.
5. Clubhouse: seven launchers use existing mini-games, 3D/2D switch, close/reopen, existing rewards, fallback when WebGL unavailable. Check tap targets, overlap and GPU load.
6. World Map: chapter selection, stars, locks, current mission, detailed mission list and practice/debug access. Confirm next-level previews and legacy access rules (optional bonus missions remain accessible).
7. Mission transitions: Victory/Game Room next and consecutive map selection, correct destination, skip, reduced motion, no unintended reward or save changes.
8. Portrait/landscape, touch, large text, 20-minute stability, no lag/crash, measured FPS if possible; repeat Clubhouse opens.
9. Save/reload and offline after full cache; do not erase original stable data. Preview-origin saves remain separate from production-origin saves.
10. Child can start and progress with minimal adult help; record what was confusing and whether voice, map and worlds were enjoyable. No new child tracking.

## Release guard
Exact RC commit CI must pass; verify Vercel preview target, commit and HTTP root/manifest/service worker. HTTP checks do not prove gameplay, rendering, audio or offline. Actual device acceptance is pending. Known limitations: browser TTS rather than recorded voice; synthetic ambience and music; decorative next-route hologram and short 2D travel instead of traversable connected 3D world; separate Clubhouse renderer may increase GPU load. Existing production alias and archive/v0.3-family unchanged. No main merge or production promotion before family acceptance. After acceptance archive source, verify merged CI and production deployment, preserve prior stable rollback; Chapter 7 begins only after release gate.
