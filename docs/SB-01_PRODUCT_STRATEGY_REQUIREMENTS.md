# SparkBot — SB-01 Product strategy and requirements
Status: proposed requirements, 2026-11-27. Baseline deployed commit 60d3eabbf583b1aba7a6b7caca6370bf1e651091.
## Evidence and scope
Parent-reported family playtest: game launch, robot assembly, coding blocks, voice/tutorial comprehension, Level 1 completion, tablet touch, and 15-minute lag/crash check all PASS. Device model, browser version, assistance level, repeat counts and FPS were not recorded. This is not independent testing, all-level acceptance, or evidence of learning gains. Preserve the working candidate. Existing chapters in src/game/educationStrategy.ts are Ages 6–8, 7–9, 8–11 and 9–12; ages 5–6 starter track is a proposed addition, not current certification.
## Vision
A child-friendly 3D robotics adventure: Build → Predict → Code → Run → Observe → Debug → Celebrate → Transfer. Make play intrinsically rewarding rather than maximizing session time. Family users first, educators later. No child login or payment in beta.
## Requirements backlog
| ID | Priority | Requirement | Acceptance |
|---|---|---|---|
| SB-F01 | P0 | First-time junior path (5–7), prebuilt bot or guided assembly, pictograms and spoken prompts | From clean local profile, a supervised child can start a guided mission with <=2 taps; all controls usable without drag; optional reading and timer off; record independent vs assisted completion. Preserve current story as standard mode. |
| SB-F02 | P0 | Progressive campaign, 16 existing levels | Each level has valid winning solution and deterministic regression fixture, clear goal, new concept, failure reason, retry and next mission; no progression softlock. |
| SB-F03 | P0 | Accessible touch and responsive layout | 44 CSS px minimum primary touch targets, no clipped primary actions on supported tablet/phone widths and orientations, visible focus, labels, non-color cues, reduced motion and mute. |
| SB-F04 | P0 | Local save and safe child mode | Guest play without account; alias only; reload restores progress; corrupted storage recovers; parent can export/delete; no new child data collection, chat, ads, or purchases. Audit all network calls, fonts, host logs, speech implementation and SDKs before broader distribution. |
| SB-F05 | P1 | Educational transfer | One concept per introductory mission; predict and observe, explanatory feedback, hint ladder; child solves a different equivalent puzzle without final-answer hints; record assistance separately. |
| SB-F06 | P1 | Coherent world and 3D quality | Consistent art direction, readable paths, clear silhouettes, environmental obstacles and nonviolent rescue story; no gameplay-critical effects hidden by low graphics. |
| SB-F07 | P1 | Creative sandbox | Build/test/reset, safe import validation and bounded simulation; local sharing only with adult oversight; no public publishing. |
| SB-F08 | P1 | Parent learning report | Separate completion from independent mastery; show attempts, hints, concepts and time without ranking children. Adult gate must be stronger before external links, real purchases or personal data; existing hold/math is not consent verification. |
| SB-N01 | P0 | Build quality | Locked dependencies; lint, existing unit tests and build in CI; smoke tests for first mission, save/reload and all-level winning fixtures; exact-head checks before release. |
| SB-N02 | P0 | Performance and offline | Target sustained >=30 FPS on agreed baseline tablet during active gameplay, 15-minute runs without crashes or progressive slowdown, asset budget measured; after successful initial online cache, verify offline mission and reload. Targets, not measured results. |
| SB-N03 | P0 | Privacy and store review | Review COPPA applicability and third-party data flows, privacy notice, retention/deletion, parental consent if required; no tracking ads. Google Play Families and Apple Kids category review before submission. |
| SB-N04 | P1 | Native apps | Android APK/AAB from exact web candidate, iPad browser/PWA first; native iOS only after tooling/device QA. |
## Proposed progression
Junior 5–7: tap, move, sequence, recognize obstacles, visual cause/effect, optional voice. Explorer 7–9: build, jumps, traction, repeat loops. Engineer 9–12: sensors, optics, conditions, functions, timing and combined systems. Do not gate on age alone; let parent choose or child switch difficulty. Existing chapter metadata remains unchanged until implementation review.
## Metrics and acceptance
Pilot targets (not results): 80% of at least 5 supervised age-appropriate testers complete first guided mission within 10 minutes, record assistance; 100% existing 16 level regression fixtures; no P0 defects; 30 FPS target on documented baseline hardware; verify save/reload and offline; at least 70% of pilot participants solve a matched transfer task independently after instruction (exploratory sample, not efficacy claim). No engagement pressure; optional breaks, no loss penalties for missed days. Record only anonymous aggregate parent-reported observations for this phase, no new network telemetry.
## Release sequencing
SB-02 baseline CI and QA; SB-03 junior onboarding + touch/feedback; SB-04 all 16 level balance and curriculum; SB-05 art, performance and offline; SB-06 parent/privacy and native packaging; SB-07 multi-family pilot; SB-08 commercial decision. Keep current family deployment working. Commercial release HOLD. Suggested future model free starter, parent-controlled one-time content pack, optional school licensing after pilot; no real-money child economy or subscriptions until value is proven.
## References
- https://www.scratchjr.org/about/info
- https://apps.apple.com/us/app/lightbot-programming-puzzles/id657638474
- https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa
- https://support.google.com/googleplay/android-developer/answer/9893335
- https://developer.apple.com/kids/
