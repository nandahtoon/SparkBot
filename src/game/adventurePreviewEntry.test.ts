import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('isolated draft opens adventure test without a query and legacy game only by explicit opt-in',()=>{
 const entry=fs.readFileSync('src/main.tsx','utf8');
 const preview=fs.readFileSync('src/components/AdventureSlicePreview.tsx','utf8');
 assert.match(entry,/get\('legacyGame'\) === '1'/);
 assert.match(entry,/legacyGame \? <App \/> : <AdventureSlicePreview \/>/);
 assert.match(entry,/if \(legacyGame\) \{\s*registerSW/);
 assert.match(preview,/href="\/\?legacyGame=1"/);
});
