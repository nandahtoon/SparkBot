import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('adventure title uses shared launch model and keeps optional games in More',()=>{
 const title=fs.readFileSync('src/components/TitleOverlay.tsx','utf8');
 const app=fs.readFileSync('src/App.tsx','utf8');
 const map=fs.readFileSync('src/components/AdventureMap.tsx','utf8');
 assert.match(title,/useState<LaunchMode>\('story'\)/);
 assert.match(title,/getMainGameLaunch\(journey\)/);
 assert.match(title,/data-testid="main-journey-context"/);
 assert.match(title,/CharacterVoiceButton id="main_journey_goal"/);
 assert.match(title,/launch.actionLabel/);
 const more=title.indexOf('aria-label="More activities"');
 const games=title.indexOf('id="titleGameRoomBtn"');
 const primary=title.indexOf('storyMissionPlayBtn');
 assert.ok(more>=0 && games>more && games<primary);
 assert.ok(title.indexOf('id="titleAdventureMapBtn"')>primary);
 assert.match(title,/id="juniorGuidedStartBtn"/);
 assert.match(title,/id="modeDailyTab"/);
 assert.match(app,/journey=\{mainGame\}/);
 assert.match(app,/if \(target && canEnterCampaign\(target, save\)\) beginLevel\(target\)/);
 assert.match(app,/currentLevelId=\{mode === 'TITLE' \? \(mainGameLaunch.missionId/);
 assert.match(map,/buildMainGameSnapshot\(save\)/);
});
