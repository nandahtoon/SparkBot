# V0.2 RC1 — Family Preview release gate
Stable baseline main 60d3eabbf583b1aba7a6b7caca6370bf1e651091 remains untouched. Candidate integrates stacked SB-02 through SB-04A2 and SB-01 requirements document. Chapter 1–5, 20 missions. Chapter 6–10 deferred until family acceptance. No commercial publication.

## Changes
- Chapter 5 dedicated sunrise palette, background solar arrays (three instanced meshes, hidden in other chapters), existing physics unchanged.
- Explicit Chapter 5 three-star route and unsolved optics checks; full 20-mission regression retained.
- Web preview visibly labeled V0.2 RC1; do not advertise stale native export. Vercel build excludes old ZIP. Native project and Android APK require independent exact-version build.
- Preview and stable origins have separate browser localStorage; do not clear or assume shared saves. Physical testing can use a fresh preview guest profile. No save migration claimed.

## Before stable release
- Exact-head CI lint, regression, web build and PWA files must pass.
- Verify preview deployment exact commit, HTML/manifest/service worker HTTP response; actual WebGL scene and touch not established by HTTP.
- Family test: launch, Learn to Play, mute/voice, touch, portrait/landscape, Level 1 through victory, Chapter 5 all four missions, replay/retry/map/next, reload saves, offline after cache, 20 min stability. Document device and assistance, no child identity or logs needed.
- Check 30 FPS target on actual tablet; visual check solar panels and critical cues. Existing >700 KB JS warning and ~36 MiB PWA cache remain performance follow-up.
- Preserve stable URL until explicit acceptance; no main merge/promotion before family approval. Record exact accepted commit/tag, release notes and rollback pointer. No new chapter while this gate is open.

## RC1 family feedback and RC2 follow-up — 2026-11-27
Parent reports all eight checklist items exercised: launch/loading, Learn to Play/voice, assembly/coding, missions 17–20, portrait/landscape, save/reopen, 20-minute lag/crash check, favorite mission observation. Checkbox completion is not a confirmed PASS result; favorite mission, crash/lag outcome, device/FPS, assistance, offline and retry/next outcomes were not supplied. Screenshot shows the mission map with age labels, completed stars on missions 1 and 2, mission 3 highlighted; it does not establish Chapter 5 completion. Requested change: remove displayed age ranges. RC2 removes ranges from map, guided entry, mini-games and parent summary, retains curriculum age metadata, and gives the map a dedicated heading/close row. Recheck on phone/tablet; preserve existing stable URL and save data. RC2 preview must be independently checked, no stable promotion until explicit acceptance. Previous RC1 CI run 46089700187 succeeded.
