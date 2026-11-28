import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, BONUS_LEVELS, getLevelById, createEmptyChassis, computeChassisInfo, findShortestTrackPlan, simulateProgram, cloneCircuitGrid, traceCircuit, findCircuitFixCell, type CodeBlock, type BlockType } from './engine';

const campaign = [...LEVELS, ...BONUS_LEVELS];
test('campaign contains unique mission IDs 1–20', () => {
  assert.deepEqual(campaign.map(l => l.id).sort((a,b) => Number(a)-Number(b)), Array.from({length:20}, (_,i)=>i+1));
});
for (const level of campaign) {
  test(`campaign ${level.id}: budget-valid route reaches gate`, () => {
    assert.equal(getLevelById(level.id), level);
    const plan = findShortestTrackPlan(level);
    assert.ok(plan, 'No route found');
    const chassis = createEmptyChassis();
    chassis[2][1] = plan.profile.treads ? 'treads' : 'wheels';
    chassis[1][2] = 'laser';
    if (plan.profile.thrusters) chassis[1][0] = 'thrusters';
    if (plan.profile.booster) chassis[0][1] = 'booster';
    assert.equal(computeChassisInfo(chassis).cost, plan.profile.cost);
    assert.ok(plan.profile.cost <= level.budget);
    const program: CodeBlock[] = plan.sequence.map((type, i) => ({id: `regression-${i}`, type: type as BlockType}));
    const result = simulateProgram(level, chassis, program);
    assert.equal(result.status, 'win', result.failReason ?? 'route failed');
    assert.equal(result.finalPos, level.track.length-1);
    assert.deepEqual(simulateProgram(level, chassis, program), result);
  });
  test(`campaign ${level.id}: optical puzzle has a reachable solution`, () => {
    const grid = cloneCircuitGrid(level.circuit);
    const initial = cloneCircuitGrid(grid);
    const cells = grid.flatMap((row,r)=>row.flatMap((cell,c)=>cell.type==='mirror'||cell.type==='splitter'?[{r,c}]:[]));
    assert.ok(cells.length <= 16, 'Optical search budget exceeded');
    let solved = false;
    for (let mask=0; mask<2**cells.length; mask++) {
      for (let i=0;i<cells.length;i++) {
        const {r,c}=cells[i];
        grid[r][c].rot=(mask>>i)&1;
      }
      if (traceCircuit(grid).solved) { solved=true; break; }
    }
    assert.ok(solved, 'No optical solution found');
    assert.deepEqual(level.circuit, initial, 'Source level mutated');
    if (!traceCircuit(initial).solved && cells.length<=7) assert.ok(findCircuitFixCell(initial), 'No hint available');
  });
}
