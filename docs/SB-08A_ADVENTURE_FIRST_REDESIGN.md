# SB-08A — Adventure-first redesign (strategy revision)
Date: 2026-11-27 US Eastern. Evidence: current head 41dffacf8c3c32abbc413df29d8d71b752280eb6, SB-01 requirements, ten-chapter roadmap, levels.ts, missionCurriculum.ts, missionObjectives.ts, educationStrategy.ts, missionPrototypes.ts, arcadeGames.ts, RC1 parent-reported 6/10 acceptance and later Mission 21/22 screenshots. User requests game strategy reassessment and redesign. This document proposes the next product direction, not a measured efficacy or commercial-release claim.

## Diagnosis
- All 24 campaign missions use the same one-dimensional tile simulator; 1–20 default to gate + optics, 21–24 explicitly diversify collect, survey, timed delivery, repair/power. Different objectives are real but not enough to change the core feel. Scene decoration and forward-only route previews cannot solve that problem.
- Existing core Build → Predict → Code → Run → Observe → Debug → Celebrate → Transfer is educationally useful but starts with tools rather than a compelling goal. Pre-reader visual quiz, voice and independent play were parent-reported PASS on RC1. Four device gates were not confirmed. Preserve the accessible first chapter, no visible age labels, no forced quiz/timer, no loss penalties.
- Existing Game Room has 7 activities, including direct 3D expedition, arcade and logic games; campaign progression is separate. Use exploration as the campaign's organizing principle, not additional unrelated reward loops. No evidence of learning transfer, or sustained engagement across children.

## Revised product promise
SparkBot — Explore, Help, Invent. A robot companion helps a child restore a connected world through purposeful actions and increasingly useful code. Coding is a tool for adventure, not a separate school worksheet. Keep familiar commands and opt-in guided coding. Goals-first loop: See a problem → Explore/touch → Plan → Code or act → Watch world respond → Celebrate → Try a changed challenge. Direct exploration is scaffolding, not a bypass for independent programming assessment. Do not claim skill mastery from stars.

## Experience pillars
1. Each chapter introduces a materially distinct primary interaction. A new scenery, extra crystal or second gate alone does not count. Introduce one mechanic, guided play, independent variation, then chapter finale.
2. Use a small navigable environment with meaningful routes, return journeys and optional discovery. Camera and map communicate locations; no claim of streaming until implemented. Visual-first instructions, optional speech, icon consistency, clear feedback even muted. No reading requirement for first play.
3. Persistent world restoration visible on map after completing goals; no recurring chores, artificial urgency or streak pressure. Existing stars, IDs and local progress preserved; any new world-state schema needs migration tests. Parent report separates exploration, assisted code and independent transfer.
4. Games and creative lab remain optional. Physical touch, audio, no lag, offline and replay tests before stable release. Preserve seven mini-games, existing curriculum and working stable V0.3.

## Revised chapter design (proposed, not shipped)
| Chapter | Signature activity | Core concept | Engine change |
|---|---|---|---|
| 1 Junkyard | build a friendly robot and deliver parts | sequence & cause/effect | retain accessible first mission, simplify later compulsory optics only after acceptance |
| 2 Swamp & Sky | choose equipment and routes across terrain | traction, ramps, loops | spatial routes and meaningful part selection |
| 3 Starport | investigate and restore disconnected machines | sensors, conditions, optics | interactive machinery |
| 4 Citadel | guide rescue bots through changing signals | timing, functions | nonviolent rescue goal and reusable routines |
| 5 Energy | distribute a limited supply to stations | planning and efficiency | explicit resource/delivery rules |
| 6 Ocean | navigate branching research docks, repair beacons and return | mapping, observation, timing | spatial navigation and explicit interaction |
| 7 Garden | plant and water, choose resource allocation | environmental systems | plant-care action and bounded resources |
| 8 Space | navigate orientation and coordinate destinations | relative turns and route planning | grid/3D graph navigation |
| 9 Inventor | design, test and compare solutions | debugging, creativity | challenge sandbox and transfer |
| 10 Future City | restore transport and power services | integrated systems | accepted mechanics combined |
Existing IDs 1–24 preserved; 25–40 remain future work. Do not retrofit all missions at once or invalidate earned stars.

## Stage SB-08A1 (implemented prototype)
Missions → Rescue Adventure · Try it. Two small, actual branching 2D dock maps. Explore directly with arrows; repair two beacons only at their locations with wrench; return to home to win. Code mode creates a sequence from the same actions and uses the same deterministic rules, Run/Step/Undo/Reset. Second map is a changed layout, not evidence of independent transfer. No timer, score, reward, save writes or external telemetry. No new campaign IDs; all legacy missions remain. Explicitly a 2D practice prototype, not connected 3D campaign. Verify solvability, no wall movement, repeated/wrong-location repair, incomplete return, command cap, deterministic trace. Device usability and comprehension pending.

## Stage gates
A1 prototype and CI → A2 supervised family trial (child finds/repairs/returns, learns to plan a different route, explore vs code recorded separately; compare preference with linear track) → A3 3D renderer for same grid/graph rules, camera, arrows and interaction points → A4 scoped Ocean vertical slice with real connected sites, optional legacy level entry and migration → A5 all-chapter redesign plan, only accepted mechanics reused → A6 consolidated RC with family regression. Freeze V0.4 expansion, SB-06G7C cinematic-only work and commercial/native release until prototype strategy accepted. Existing V0.3 stable remains unchanged; V0.3.1 production HOLD. No fabricated learning gains, no new data collection, no ads/purchases.


## Owner-approved experimental exception (2026-11-28)
See docs/SB-08A3_EXPERIMENTAL_GATE.md. Isolated experimental SB-08A3 development is authorized while A2 remains pending. This is not acceptance, integration authorization for experimental runtime, or release approval. Preserve the pinned family candidate and stable main. Read live experiment PR and branch before continuing.
