import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getLevelById} from './levels';
import {getSurveyStations} from './missionObjectives';
import {missionVoice} from './characterGuidance';
test('survey guidance uses actual station data and same clock metaphor',()=>{
 const level=getLevelById(22)!;assert.deepEqual(getSurveyStations(level),[1,4]);
 assert.match(missionVoice(level),/clock circles.*clock command/);
 assert.doesNotMatch(missionVoice(getLevelById(21)!),/clock circles/);
 const dock=fs.readFileSync('src/components/CodeDock.tsx','utf8'),app=fs.readFileSync('src/App.tsx','utf8'),world=fs.readFileSync('src/three/worldScene.ts','utf8');
 assert.match(dock,/surveyStations.includes\(idx\)/);assert.match(dock,/survey-visual-goal/);assert.match(dock,/survey-tile-clock/);
 assert.match(app,/surveyStations=\{getSurveyStations\(currentLevel\)\?\?\[\]\}/);
 assert.match(world,/longHand.*ring.material/);assert.match(world,/shortHand.*ring.material/);
});
