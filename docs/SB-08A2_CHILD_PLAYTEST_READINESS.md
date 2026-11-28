# SB-08A2 — Rescue adventure family validation preparation
Date: 2026-11-27 US Eastern. Base: PR #27 at 5b67ebe432a6781348a436034ae84d6cb8acbdd2. Status: proposed/prepared; no family trial of this head yet.

## Director decision
Explore · Help · Invent remains the product promise. Preserve 24 campaign mission IDs, 7 mini-games, stable V0.3, existing local saves and V0.3.1 stable HOLD. Do not start Chapter 7, expand to all chapters, or implement production 3D before the A2 evidence gate. This PR changes optional 2D practice only, not the campaign or data model.

## Design and engineering changes
- Persistent goal icon and optional spoken cue for find beacon / repair here / return home / complete. Cue derived from shared deterministic rules, not an automatic solution or route hint. The robot marker occupies part of a cell rather than covering its entire landmark.
- Explore and Code maintain independent in-session progress while switching modes; switching maps deliberately starts fresh; reselecting current map/mode is a no-op. Reset affects current mode. Pause/Step then Run resumes from the visible program cursor; completed or failed traces replay from start. No score, telemetry, reward or save writes.
- Two new focused rule tests for goal phases and cursor resume. Visual, touch, speech and actual pause behavior require device checks; unit tests alone do not establish them.

## Education design rationale
Use child agency, wonder and meaningful goal-directed play, with optional guidance rather than answer disclosure (NAEYC DAP principles https://www.naeyc.org/resources/position-statements/dap/principles). Guided play has evidence of benefits for some outcomes, not all; Skene et al. 2022 systematic review https://pubmed.ncbi.nlm.nih.gov/35018635/. Neither source establishes efficacy of SparkBot.

## Family trial (5–10 minutes, optional stop anytime)
1. On a known test build and device, enter Missions > Rescue Adventure. Without reading the screen aloud, observe if the child can find the goal and move. Offer the voice button if wanted.
2. Beacon Bay Explore: observe whether the child finds both beacons, uses the wrench at the correct place, and returns home. Let the child choose routes and recover from water. No time limit.
3. Code: invite, never require, the child to plan a short route, step, pause/resume, and change a command after a blocked action. Record direct play separately from coded play.
4. Reef Rescue: observe whether the child can apply the same concept on a changed map with no route demonstration. This is a transfer opportunity, not a validated measure of mastery.
5. Offer a familiar linear mission and ask which activity the child would like to play again; accept neither. Check portrait, landscape, muted visuals, speech, navigation, offline behavior, accidental taps, comfort and ability to stop.

## Evidence template (manual, no personal child data)
Build SHA / device category / orientation; per task mark independent / verbal hint / demonstration / not attempted. Note confusing icon or interaction (no child name, recordings or identifiers). Record explore completion, code planning, debugging, changed-map attempt, preference separately. No fixed speed target, forced completion or diagnostic interpretation. Stop if frustrated or tired.

A2 gate: physical device shows understandable visual/voice goal, route choice and repair/return loop without persistent adult direction; code optional and mode switch/pause safe; no clipping/crash or loss of legacy progress. If not met, iterate A2. Individual family feedback is usability evidence, not population learning efficacy. A3 only after explicit review; same rules with a 3D renderer, no new campaign IDs. A4 connected Ocean vertical slice after A3, followed by chapter redesign and consolidated RC.


## Owner-approved experimental exception (2026-11-28)
See docs/SB-08A3_EXPERIMENTAL_GATE.md. Isolated experimental SB-08A3 development is authorized while A2 remains pending. This is not acceptance, integration authorization for experimental runtime, or release approval. Preserve the pinned family candidate and stable main. Read live experiment PR and branch before continuing.
