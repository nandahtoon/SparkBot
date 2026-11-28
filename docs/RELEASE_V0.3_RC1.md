# V0.3 RC1 — Family Preview acceptance
Consolidated SB-04V1–V3, SB-06A–B (PRs 9–13) based on stable V0.2 main e12bcd23d7fffd25fa59909ffebcba5e93905538. Source baseline 0496f2dca6d78132f7cc20b7f7406a4167388c5d, exact CI 46092747906: 173 tests passed, zero failed/skipped, typecheck/build/output successful. Candidate label and matching assertion only; no gameplay changes in consolidation.

## Contents
Six chapters, 24 campaign missions, three optional practice challenges. Chapter 6: Tide Survey (collect all three samples), Reef Survey (WAIT at two unique observation stations), Current Patterns (timed safety barrier), Ocean Beacon (repair starter code and light two cores). Four distinct scenery landmarks, mission-specific hints and victory messages. Survey confirmation sound/visual cues and reset. No real fluid physics, underwater navigation or new native package. Age ranges remain hidden in player UI.

## Acceptance
- Exact candidate CI must pass before family test; verify preview deployment source and HTTP HTML, manifest and service worker. HTTP checks are not gameplay proof.
- Compare mission 21–24: do actions and goals actually feel different? Record which is enjoyable and why, without child personal details.
- Mission 21: missed sample fails; all three succeeds. Mission 22: wrong or duplicate WAIT does not count; both markers confirm and reset on replay. Mission 23: wrong timing fails, WAIT can enable safe crossing. Mission 24: broken starter fails, corrected program reaches circuit, both cores required.
- Test prior chapters, Map, Home, next/retry, portrait/landscape touch controls, save/reload, offline after full cache, 20 minutes no crash/lag. Target 30 FPS on physical tablet, actual measurement pending.
- Known limits: front laser still required even on non-optics missions; linear walkway, not actual water currents. Existing large JS chunk warning (>700 kB) and PWA precache ~36 MiB remain. No commercial release.
- Preview origin has separate local saves from stable URL. Do not clear original save or promise cross-origin transfer. Stable V0.2 remains unchanged pending family approval; no main merge/promotion. Archive accepted V0.3 source and previous stable rollback deployment only on release acceptance. Chapter 7 begins after stable V0.3.
