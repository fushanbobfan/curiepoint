import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLattice } from '../src/lattice.js';
import { createWorkspace, wolffSweep } from '../src/dynamics.js';
import { CRITICAL_TEMPERATURE, onsagerEnergy } from '../src/observables.js';
import { createScan, currentTemperature, scanProgress, scanTemperatures, stepScan } from '../src/scan.js';
import { createRng } from '../src/rng.js';

test('scan temperatures are evenly spaced and include both ends', () => {
  assert.deepEqual(scanTemperatures(4, 1, 4), [4, 3, 2, 1]);
  assert.deepEqual(scanTemperatures(2, 3, 1), [2]);
});

test('each temperature gets its settling and measuring sweeps, then the scan stops', () => {
  const lat = createLattice(4, 'up');
  const scan = createScan({ from: 3, to: 1, points: 3, settle: 2, measure: 3 });
  const seen = [];
  let points = 0;
  while (!scan.done) {
    if (stepScan(scan, lat, 0, (T) => seen.push(T))) points++;
  }
  assert.equal(points, 3);
  assert.deepEqual(seen, [3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1]);
  assert.equal(scanProgress(scan), 1);
  assert.equal(stepScan(scan, lat, 0, () => assert.fail('swept after the end')), null);
  assert.equal(currentTemperature(scan), 1);
});

test('a frozen lattice measures |m| = 1, the ground energy and no fluctuations', () => {
  const lat = createLattice(4, 'up');
  const scan = createScan({ from: 1, to: 1, points: 1, settle: 1, measure: 5 });
  let point = null;
  while (!point) point = stepScan(scan, lat, 0.5, () => {});
  assert.deepEqual(point, { T: 1, absM: 1, e: -2.5, chi: 0, heat: 0 });
  assert.ok(Math.abs(scanProgress(scan) - 1) < 1e-12);
});

test('a Wolff scan brackets the transition and tracks the exact energy', () => {
  const rng = createRng(21);
  const lat = createLattice(24, 'random', rng);
  const ws = createWorkspace(24);
  const scan = createScan({ from: 3.2, to: 1.6, points: 5, settle: 60, measure: 150 });
  while (!scan.done) stepScan(scan, lat, 0, (T) => wolffSweep(lat, ws, T, 0, rng));
  const [hot, , , , cold] = scan.results;
  assert.ok(hot.absM < 0.3 && cold.absM > 0.95);
  // Away from Tc a 24 x 24 lattice is already close to the infinite one;
  // near Tc finite-size corrections are larger, so allow more room there.
  for (const p of scan.results) {
    const tol = Math.abs(p.T - CRITICAL_TEMPERATURE) > 0.3 ? 0.03 : 0.1;
    assert.ok(Math.abs(p.e - onsagerEnergy(p.T)) < tol, `T = ${p.T}: ${p.e}`);
  }
  // Susceptibility peaks near Tc, not at the ends.
  const peak = scan.results.reduce((a, b) => (b.chi > a.chi ? b : a));
  assert.ok(Math.abs(peak.T - CRITICAL_TEMPERATURE) < 0.5, `peak at ${peak.T}`);
});
