import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('splash stays branded and exposes only a friendly recovery action', () => {
 const html=fs.readFileSync('index.html','utf8');
 const splash=fs.readFileSync('src/game/splashScreen.ts','utf8');
 assert.doesNotMatch(html,/app-splash-status|Powering up workshop/);
 assert.doesNotMatch(splash,/statusLabel|statusEl/);
 assert.match(html,/app-splash-retry/);
 assert.match(html,/prefers-reduced-motion/);
 assert.match(splash,/aria-valuenow/);
});
test('junior session keeps timer off, provides spoken guidance and simplified coding without changing save settings',()=>{
 const app=fs.readFileSync('src/App.tsx','utf8');
 const code=fs.readFileSync('src/components/CodeDock.tsx','utf8');
 const guide=fs.readFileSync('src/components/GuidedTutorialOverlay.tsx','utf8');
 assert.match(app,/!juniorSession && Boolean\(save.challengeTimerEnabled\)/);
 assert.match(app,/!cur.juniorSession && Boolean\(cur.save.challengeTimerEnabled\)/);
 assert.match(app,/junior=\{juniorSession\}/);
 assert.match(code,/junior \? \(\['MOVE'\]/);
 assert.match(guide,/!junior \|\| muted/);
 assert.match(guide,/SPEECH.speak\(spokenHint/);
});
