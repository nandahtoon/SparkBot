# SparkBot — Agent instructions
Canonical repository: https://github.com/nandahtoon/SparkBot (GitHub ID 1467911889, owner/name nandahtoon/SparkBot). Scope is SparkBot/BotAdventure only. Never read or modify other repos for this project unless the owner explicitly changes scope.
Read docs/START_HERE.md, docs/REPOSITORY_GOVERNANCE.md, docs/SB-08A_ADVENTURE_FIRST_REDESIGN.md and docs/SB-08A2_CHILD_PLAYTEST_READINESS.md first. Verify live branch and PR status before edits; these documents are a checkpoint, not a substitute for live evidence.
Stack: React, TypeScript, Three.js, Vite, Bun, PWA, Capacitor Android. Do not migrate engine or merge unrelated game code.
Stable main is V0.3 family edition at 7028aaa5aab718aff4cdbcfaea6cc4d11818ff33. Production, public/commercial/native promotion HOLD. Preserve archive refs and existing local saves; never force-push, delete archives or deploy production without explicit owner authorization.
Use integration/sb-08r as the consolidated testing baseline until an explicitly reviewed successor. One scoped topic branch and PR targeting the integration baseline; no independent parallel writers on same files. Never merge superseded stacked PRs into main piecemeal.
Keep 24 campaign mission IDs, 7 Game Room activities, pre-reader visuals, speech, audio, offline behavior and prior local progress. No new child PII, telemetry, ads, purchases, logins or network dependencies without approval and privacy review.
For each increment: bun install --frozen-lockfile; bun run lint; node --import tsx --test src/game/*.test.ts tests/*.test.ts; bun run build. Verify exact-head GitHub Actions, distinguish automated from physical/child testing. Keep family evidence anonymous; no invented PASS, FPS or learning gains.
Record changed files, exact SHA, CI run, unresolved gates, rollback and next work. Stop before main merge, production promotion or destructive cleanup unless separately authorized.

## Cross-tool handoff (mandatory)
Read docs/PROJECT_STATE.json, docs/AI_HANDOFF_PROTOCOL.md and docs/AI_START_PROMPT.md. Before local edits fetch origin and run node scripts/check-project-context.mjs --preflight from a scoped topic branch. CI runs the context contract check. Update state and evidence in the same reviewed increment when the active stage changes. A plain Next means one unblocked package, not release authorization. Never use an AI Studio preview as source of truth.


## Owner-approved experimental exception (2026-11-28)
See docs/SB-08A3_EXPERIMENTAL_GATE.md. Isolated experimental SB-08A3 development is authorized while A2 remains pending. This is not acceptance, integration authorization for experimental runtime, or release approval. Preserve the pinned family candidate and stable main. Read live experiment PR and branch before continuing.
