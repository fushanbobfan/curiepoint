import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLattice, energy, magnetization, neighbourSum, neighbourTable } from '../src/lattice.js';
import { createRng } from '../src/rng.js';

test('the seeded generator is reproducible and stays in [0, 1)', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 1000; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('an ordered lattice has m = ±1 and the ground-state energy -2 per spin', () => {
  const up = createLattice(8, 'up');
  assert.equal(magnetization(up), 1);
  assert.equal(energy(up), -2);
  assert.equal(energy(up, 0.5), -2.5);
  const down = createLattice(8, 'down');
  assert.equal(magnetization(down), -1);
  assert.equal(energy(down, 0.5), -1.5);
});

test('a checkerboard is the highest-energy state at +2 per spin', () => {
  const lat = createLattice(6, 'up');
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) lat.spins[y * 6 + x] = (x + y) % 2 ? -1 : 1;
  assert.equal(magnetization(lat), 0);
  assert.equal(energy(lat), 2);
});

test('neighbours wrap around the edges', () => {
  const table = neighbourTable(4);
  // Site (0,0): right (1,0), left (3,0), down (0,1), up (0,3).
  assert.deepEqual(Array.from(table.slice(0, 4)), [1, 3, 4, 12]);
  const lat = createLattice(4, 'up');
  lat.spins[3] = -1;
  lat.spins[12] = -1;
  assert.equal(neighbourSum(lat, 0, table), 0);
});

test('a random start is roughly balanced', () => {
  const lat = createLattice(64, 'random', createRng(7));
  assert.ok(Math.abs(magnetization(lat)) < 0.05);
});
