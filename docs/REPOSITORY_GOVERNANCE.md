# SB-08R — Repository reconciliation & engineering governance
Date: 2026-11-27 US Eastern. Scope only nandahtoon/SparkBot (ID 1467911889).
## Verified baseline and ancestry
- main: 7028aaa5aab718aff4cdbcfaea6cc4d11818ff33, V0.3 Stable Family Edition. Exact CI 46093521397. Archive/v0.3-family same SHA; archive/v0.3-rc1-accepted cfac0d3c4a1b33790367ad2cba3f0c849d621758; archive/v0.2-family e12bcd23d7fffd25fa59909ffebcba5e93905538.
- Vercel project sparkbot prj_CsXzZlJrvsICytVHib1t17K7KrmR. Latest production record READY dpl_3c2mf43dqLG3uaPnYFm4ES1qvBkd, metadata nandahtoon/SparkBot main exact SHA above; prior V0.2 READY rollback dpl_4MjwLBof5bRPD8YuGwLQQ6KcghwQ. This is deployment metadata, not a live device/alias HTTP proof. No production changes requested.
- Latest pre-governance head #28 179f485e6a160335fa01f8e069e65d30cf322c24, CI 46103652601 PASS. Compare main...head: 19 ahead, 0 behind, 67 changed files. Full history contains all #15–28 heads. All earlier stable history verified via main commits API.
## PR reconciliation ledger (24 open drafts at audit)
| PR | Head SHA prefix | Disposition |
|---|---|---|
| #1 | f8061b1 | sole added file already in main, same blob ab6f012a9a39753720aced7351129127e39345a8; content-equivalent, not ancestor |
| #3 | 2024b45 | exact ancestor of main |
| #4 | 02750ee | exact ancestor of main |
| #5 | 75a1a9f | exact ancestor of main |
| #6 | 6fcb0c9 | exact ancestor of main |
| #7 | 34c5381 | exact ancestor of main |
| #10 | fb696dd | exact ancestor of main |
| #11 | 4e6b53e | exact ancestor of main |
| #12 | dcc5ed8 | exact ancestor of main |
| #13 | 0496f2d | exact ancestor of main |
| #15 | 6002f07 | contained in consolidated candidate |
| #16 | 18dcc4a | contained in consolidated candidate |
| #17 | 7aeb176 | contained in consolidated candidate |
| #18 | 466e355 | contained in consolidated candidate |
| #19 | 54ca657 | contained in consolidated candidate |
| #20 | 5cab96e | contained in consolidated candidate |
| #21 | 6ae4cfe | contained in consolidated candidate |
| #22 | 7c793ab | contained in consolidated candidate |
| #23 | 02403d4 | RC1 family preview checkpoint; retain review gate |
| #24 | c5613a8 | contained in consolidated candidate |
| #25 | 94a3552 | contained in consolidated candidate |
| #26 | 41dffac | contained in consolidated candidate |
| #27 | 5b67ebe | contained in consolidated candidate |
| #28 | 179f485 | contained in consolidated candidate |
Old PRs already in main can close as reconciled (not falsely mark merged). Candidate-contained drafts can close as superseded after consolidated exact-head CI; retain #23 for unfinished RC1 acceptance. Keep every source branch and PR discussion/history. Do not independently merge these PRs. No tag verification claim; archive branch refs verified.
## Branch policy
main = accepted stable source, potential auto-production deploy. archive/* = protected by policy (no force updates/deletes). integration/sb-08r = single consolidated testing baseline, never production; draft PR to main for review only. topic sb-* = one scoped increment, target integration, retain exact CI and review. Never rebase/rewrite published history; preserve sources and saves. No claim that repository server-side rules enforce this policy; branch protection setup requires separate owner review.
## Release and evidence gates
V0.3.1 family feedback PASS: visual quiz, robot voice, music/environment sound, portrait/landscape 20-minute stability, save/offline, minimal adult help. Not confirmed: differentiated worlds, clubhouse/mini-games, map/next mission, transition animation. SB-08A2 family trial not yet run. Automated CI is not acceptance. Verify exact candidate preview SHA, device and orientation, accessibility, offline and prior progress, rescue direct/code separately. Record no child PII. Do not merge main or promote release until owner acceptance, independent review, current exact CI and rollback check. No commercial/native release.
## Safe next work
A2 family acceptance → A3 spatial 3D renderer reusing rule model → A4 connected Ocean slice → A5 campaign redesign → A6 consolidated RC. No chapter expansion or premature production migration. Keep existing 24 missions/7 mini-games and current stack. For independent technical tasks, use topic PRs; do not duplicate open implementations.


## Owner-approved experimental exception (2026-11-28)
See docs/SB-08A3_EXPERIMENTAL_GATE.md. Isolated experimental SB-08A3 development is authorized while A2 remains pending. This is not acceptance, integration authorization for experimental runtime, or release approval. Preserve the pinned family candidate and stable main. Read live experiment PR and branch before continuing.
