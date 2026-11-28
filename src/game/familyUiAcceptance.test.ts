import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('player screens omit age-range labels while retaining guided entry and map controls',()=>{
 const map=fs.readFileSync('src/components/Modals.tsx','utf8');
 const title=fs.readFileSync('src/components/TitleOverlay.tsx','utf8');
 const room=fs.readFileSync('src/components/GameRoomModal.tsx','utf8');
 const report=fs.readFileSync('src/components/ParentDashboardModal.tsx','utf8');
 assert.doesNotMatch(map,/\{chapter\.ageBand\}/);
 assert.doesNotMatch(title,/ages\s+\d/i);
 assert.doesNotMatch(room,/\{puzzle\.ageBand\}/);
 assert.doesNotMatch(report,/ages\s+\d/i);
 assert.match(map,/data-testid="map-compact-header"/);
 assert.ok(map.indexOf('aria-label="Close Map"') < map.indexOf('id="mapOpenSandboxBtn"'));
 assert.match(map,/id="mapOpenClassCodeBtn"/);
 assert.match(title,/V0\.2 · Family Edition/);
});
