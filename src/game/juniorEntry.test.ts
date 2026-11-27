import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Junior guided entry is a separate accessible action and keeps normal story and daily launch', () => {
  const title = fs.readFileSync('src/components/TitleOverlay.tsx', 'utf8');
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert.match(title, /id="juniorGuidedStartBtn"/);
  assert.match(title, /onClick=\{onStartJunior\}/);
  assert.match(title, /min-h-\[44px\]/);
  assert.match(title, /onStartJunior && !isDailyMode/);
  assert.match(title, /aria-label="Story Missions"/);
  assert.match(title, /aria-label="Daily Challenge"/);
  assert.match(title, /onStartMission\(\)/);
  assert.match(title, /onStartDaily\(\)/);
  assert.match(app, /onStartJunior=\{handleReplayTutorial\}/);
  const replay = app.slice(app.indexOf('const handleReplayTutorial ='), app.indexOf('const launchSimulation ='));
  assert.match(replay, /beginLevel\(LEVELS\[0\], false\)/);
  assert.match(replay, /setTutorialForceActive\(true\)/);
  assert.doesNotMatch(replay, /setSave\(|localStorage\.clear/);
});
