# SparkBot — Cross-tool continuity contract
Applies equally to ChatGPT, Google AI Studio, Gemini, Codex and any human/AI contributor. The GitHub repo is authoritative, never a chat transcript or an AI Studio preview. Read live files at integration/sb-08r before work; main is intentionally older stable code. A tool without repository access must stop at a proposed patch and report that limitation, not claim a commit or replace the project.

## Start of every session
1. Verify GitHub owner/name and repository ID 1467911889. Fetch origin. Read AGENTS.md, docs/PROJECT_STATE.json and its requiredReads in order; use git log and open PRs to reconcile current work. Never assume cached SHA is current.
2. Confirm origin points to nandahtoon/SparkBot. For a local checkout use: git fetch origin; git switch -c sb-<work-package> origin/integration/sb-08r; node scripts/check-project-context.mjs --preflight. Use an existing topic branch if it is already assigned and up to date; do not discard local work.
3. Read current code and tests before editing. Identify the work package, acceptance, dependencies and release gate. If another agent owns overlapping files, reconcile first. A simple "Next" means choose one unblocked package from live state, not restart, expand scope or bypass acceptance.

## AI Studio / browser IDE
Open or import the canonical GitHub source at the integration branch if supported. Check actual commit and branch before editing. If Studio imports only main or cannot switch branches, use a verified export of the integration head in a separate workspace; do not modify or publish main. Copy AI_START_PROMPT.md into the tool's instructions. Studio preview is a test workspace only. Export a scoped diff against the recorded integration SHA and apply to a topic branch using GitHub; review actual diff, run checks and open PR to integration. Never sync/overwrite an entire repo from an old preview, upload credentials, or allow automatic production deployment. If GitHub access/export is unavailable, report the blocker and provide a patch; no false merge/deploy claims.

## Same design rules everywhere
Explore · Help · Invent. Goal-first child-friendly adventure, visual instructions before text, optional voice and code, one new concept at a time, safe mistakes and replay, no forced timer/quiz, no new tracking or identifying child data. Keep 24 mission IDs, 7 Game Room activities, save compatibility and existing offline behavior. Use deterministic game logic separated from presentation; React/TypeScript/Three.js/Vite/Bun/PWA/Capacitor. No engine replacement or other repository code. The design strategy and family acceptance documents are authoritative; no new mechanics beyond gated scope.

## Finish every increment
Run node scripts/check-project-context.mjs, bun install --frozen-lockfile, bun run lint, node --import tsx --test src/game/*.test.ts tests/*.test.ts, bun run build. Record actual checks and exact head CI; do not conflate simulator tests with device/learning results. Update PROJECT_STATE.json if stage, gate, or approved baseline changes, and relevant design/QA docs in the same PR. Evidence SHAs refer to already verified commits, never guess the commit containing the record itself. State changes require review, and release HOLD stays until explicit owner approval. Document next action, untested areas and rollback. A new chat begins by re-reading these files, not relying on memory.


## Owner-approved experimental exception (2026-11-28)
See docs/SB-08A3_EXPERIMENTAL_GATE.md. Isolated experimental SB-08A3 development is authorized while A2 remains pending. This is not acceptance, integration authorization for experimental runtime, or release approval. Preserve the pinned family candidate and stable main. Read live experiment PR and branch before continuing.
