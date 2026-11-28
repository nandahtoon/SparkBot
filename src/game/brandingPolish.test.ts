import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('Play & Learn branding stays aligned across web and native source', () => {
 for (const path of ['index.html','metadata.json','capacitor.config.ts','vite.config.ts','android/app/src/main/res/values/strings.xml','android/app/src/main/assets/capacitor.config.json','src/components/TitleOverlay.tsx']) {
  const source=fs.readFileSync(path,'utf8');
  assert.match(source,/Play &(?:amp;)? Learn/,path);
  assert.doesNotMatch(source,/Engineering Academy/,path);
 }
 assert.match(fs.readFileSync('capacitor.config.ts','utf8'),/com\.sparkbot\.academy/);
});
test('victory prioritizes next mission and recovery does not expose raw error details',()=>{
 const modals=fs.readFileSync('src/components/Modals.tsx','utf8');
 assert.match(modals,/You did it!/);
 assert.ok(modals.indexOf('Next Mission</span>') < modals.indexOf('id="victoryWallRunBtn"'));
 const error=fs.readFileSync('src/components/ErrorBoundary.tsx','utf8');
 assert.doesNotMatch(error,/\{this\.state\.errorMessage\}/);
 assert.match(error,/console\.error/);
});
