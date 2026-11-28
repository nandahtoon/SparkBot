# SB-08A3 — Spatial adventure architecture (design preflight only)
Baseline: c395205d08354b5f812ad61a284423521aaaac1f; exact CI 46106222207 and 46106215464 PASS. Current A2 physical trial remains open in #31. This document proposes implementation after explicit A2 review; no runtime changes, no gate waiver.

## Product and education decision
Explore · Help · Invent. First 3D slice is Beacon Bay and Reef Rescue, not a decorative room or a new menu. The child sees a dark beacon, travels a safe path, repairs it, sees it glow, returns home, then optionally programs the same actions. Keep first-time instructions visual and optional voice; direct play remains distinct from independent programming. No timers, required quizzes, stars, rewards, data collection or new mission IDs. Single Arcade catalog remains; do not reintroduce 3D Room tab. Family observation is usability evidence, not mastery or efficacy.

## Current code audit
- src/game/rescueAdventure.ts: 5x5 maps, absolute up/right/down/left/repair; immutable logical state row/col/repaired/feedback/won, trace capped at 32, stops at first error or win; goal cue derived from same state.
- src/components/RescueAdventure.tsx: direct and code state separate, shared rule functions, 350ms playback timer, map switch resets both; optional voice, goal cue and 2D grid. src/components/Modals.tsx mounts it under Missions > Rescue Adventure · Try it.
- src/game/rescueAdventure.test.ts: BFS solvability, blocked movement and wrong repair, cue phases, playback cursor. Preserve and extend; not physical evidence.
- src/three/worldScene.ts: UnifiedWorldController already owns a WebGL renderer, perspective camera, scheduling, quality control and context events; cannot assume it is dormant behind modal. src/game/planetAdventure.ts has independent continuous movement/terrain and equipment rules, not suitable as rescue authority. src/three/clubhouseScene.ts and Clubhouse3D.tsx are retained but not player-facing. Reuse rendering assets only after lifetime/coupling audit; do not copy game state or add a competing main loop.

## Proposed boundaries and contracts
1. Existing rescueAdventure.ts remains sole source of gameplay transitions. A new pure rescueSpatialPresentation.ts maps row/col to x/z, state feedback to semantic animation and repaired IDs to marker state. For 5x5 centered grid use x=(col-2)*tileSize, z=(row-2)*tileSize; up=-Z, right=+X, no rotated directional input in first slice. State does not depend on frame rate.
2. RescueAdventure.tsx retains input, program, cursor, mode, map and goal semantics. A new RescueScene component receives map + current logical state, reduced motion/quality preference, lifecycle callbacks. It never calls stepRescue, writes saves or awards points. Render interpolation only; no collision physics or continuous joystick in A3. If commands arrive faster than animation, latest logical pose wins; no queued visual movement across water.
3. Proposed Three.js scene module builds dock, path, water and beacons; geometry from map only. Beacon dark/bright + shape/check icon (not color alone), home icon, robot with clear silhouette. Render camera fixed oblique facing north with whole board visible, responsive orthographic framing; no orbit, shake, camera cuts or hidden route. Later third-person camera only after child comprehension and control acceptance.
4. One render owner at a time: inspect App/UnifiedWorldController visibility and scheduler; suspend main world drawing/input while rescue 3D is active, or use a proven shared renderer. If neither can be guaranteed, keep 2D and stop. 2D board is the accessible fallback for missing/lost WebGL; changing presentation preserves current map/state/program/cursor and goal. Retain HTML controls and semantic board summary outside canvas.
5. A3-A prototype isolated to existing rescue practice entry. No campaign rewrites. A3-B renderer integration after tests; A3-C physical acceptance. A4 connected Ocean slice only after A3 gate. Proposed file names are not yet implemented.

## Screen flow
Missions > Rescue Adventure > Beacon Bay > see beacon objective (icon + optional speech) > Explore arrows > repair > return home > optional Code mode or changed map. Same logical goal in 2D and 3D; one board presented at a time. No duplicate game menus. Controls 48 CSS px target, responsive portrait and landscape, keep reset/exit available; never rely on text/color alone. Program editing pauses and resets cursor as existing contract. No forced tutorial or replay.

## Quality and QA gates (targets, not measured)
- Deterministic parity across presentation and frame timing, same successful/failed trace; two maps unchanged, no water traversal, repair only at beacon, no early home victory, preserve 32 commands. Test mapping uniqueness, adjacency, orientation, repair marker, map reset, terminal states, fallback snapshot parity.
- Browser/device: 320/390 CSS px portrait and landscape, tablet/desktop, touch/keyboard, reduced motion, muted cues, context loss, resize, repeated enter/exit and no duplicate animation loops. Verify main renderer actually suspended, dispose all resources/observers/listeners, no memory growth across 10 cycles; measure before asserting.
- Start low-cost: capped DPR <=1.5, modest mesh count, no mandatory postprocessing or shadow maps, render on demand when idle, no new network assets. Target stable 30 FPS during motion on chosen lower-tier device and comfortable input; measure with named device/conditions. Offline after cache. Never infer FPS from build or CI.
- Family trial: independent vs verbal hint vs demonstration vs not attempted for goal, navigation, repair/return, optional code, changed map; allow stop. Compare 2D and 3D preference without requiring completion. No claims of learning gains.
- Preserve existing 24 campaign IDs, 7 games, save schema, V0.3 stable and all archives. A2 gate open; after review create a scoped topic PR targeting integration/sb-08r. Revert only that PR if regression; no main merge or production promotion.

## Implementation order once unblocked
A3-1 pure presentation mapping/tests and renderer ownership audit; A3-2 bounded scene + accessible fallback; A3-3 integration and lifecycle parity; A3-4 device/family QA. A4 then connected Ocean restoration; avoid committing entire chapter redesign simultaneously.


## Owner-approved experimental exception (2026-11-28)
See docs/SB-08A3_EXPERIMENTAL_GATE.md. Isolated experimental SB-08A3 development is authorized while A2 remains pending. This is not acceptance, integration authorization for experimental runtime, or release approval. Preserve the pinned family candidate and stable main. Read live experiment PR and branch before continuing.
