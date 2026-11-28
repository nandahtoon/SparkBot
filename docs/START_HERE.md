# SparkBot — Cross-agent handoff
Checkpoint: 2026-11-27 US Eastern / SB-08R.
1. Verify https://github.com/nandahtoon/SparkBot and repository ID 1467911889. Read root AGENTS.md and docs/REPOSITORY_GOVERNANCE.md.
2. Check main and integration/sb-08r head, PRs, exact CI and Vercel target. Start from current integration head, not a stale branch or local ZIP.
3. Product: Explore · Help · Invent. Read SB-08A_ADVENTURE_FIRST_REDESIGN.md and SB-08A2_CHILD_PLAYTEST_READINESS.md; historical requirements SB-01_PRODUCT_STRATEGY_REQUIREMENTS.md and SB-04A2_TEN_CHAPTER_ROADMAP.md; release evidence RELEASE_V0.3_RC1.md and RELEASE_V0.3.1_RC1.md.
4. Current candidate inherits PRs #15–28 at 179f485e6a160335fa01f8e069e65d30cf322c24. SB-08R adds governance only; no new gameplay. Next gate is physical family validation of rescue prototype and unconfirmed V0.3.1 RC1 items. No claim of efficacy. A3 3D renderer only after review; same deterministic rules, preserve legacy campaign.
5. Roles: Director owns scope/release gates; Designer owns story/gameplay/UI; Education specialist owns age-appropriate scaffolding and independent-vs-assisted observation; Engineer owns deterministic game rules/render separation/tests; independent QA owns exact-head checks and physical evidence. No agent grants its own release approval.
6. Report: repo ID, branch/PR, SHA, changed files, exact CI, actual family test scope, pending blockers, rollback. No child identifying information.

## New chat / AI Studio
Open docs/PROJECT_STATE.json for the current stage and gates; use docs/AI_START_PROMPT.md as the reusable tool instruction and docs/AI_HANDOFF_PROTOCOL.md for import, patch, verification and handoff. The canonical nandahtoon/SparkBot integration/sb-08r branch is authoritative; read live HEAD before every task. Run node scripts/check-project-context.mjs --preflight in a local topic checkout after fetching origin.

## SB-08A3 preflight
The spatial architecture is documented in docs/SB-08A3_SPATIAL_ADVENTURE_ARCHITECTURE.md. This is a design-only preparation while A2 acceptance remains open. Do not implement A3 until gate review. Single Arcade catalog supersedes the decorative 3D tab; keep source assets isolated.


## Owner-approved experimental exception (2026-11-28)
See docs/SB-08A3_EXPERIMENTAL_GATE.md. Isolated experimental SB-08A3 development is authorized while A2 remains pending. This is not acceptance, integration authorization for experimental runtime, or release approval. Preserve the pinned family candidate and stable main. Read live experiment PR and branch before continuing.
