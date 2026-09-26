import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLattice, magnetization } from '../src/lattice.js';
import { PALETTES, paintDisk, paintSpins } from '../src/render.js';

test('each spin becomes one opaque pixel in its palette colour', () => {
  const lat = createLattice(2, 'up');
  lat.spins[3] = -1;
  const rgba = new Uint8ClampedArray(16);
  paintSpins(lat, rgba, PALETTES.mono);
  assert.deepEqual(Array.from(rgba.slice(0, 4)), [...PALETTES.mono.up, 255]);
  assert.deepEqual(Array.from(rgba.slice(12, 16)), [...PALETTES.mono.down, 255]);
});

test('wall mode outlines only sites on a domain boundary', () => {
  const lat = createLattice(8, 'up');
  for (let y = 0; y < 8; y++) for (let x = 4; x < 8; x++) lat.spins[y * 8 + x] = -1;
  const rgba = new Uint8ClampedArray(8 * 8 * 4);
  paintSpins(lat, rgba, PALETTES.ember, true);
  const colourAt = (x, y) => Array.from(rgba.slice(4 * (y * 8 + x), 4 * (y * 8 + x) + 3));
  assert.deepEqual(colourAt(3, 2), PALETTES.ember.wall);
  // The right-hand edge wraps round to the up domain at x = 0.
  assert.deepEqual(colourAt(7, 2), PALETTES.ember.wall);
  assert.deepEqual(colourAt(1, 2), PALETTES.ember.up);
  assert.deepEqual(colourAt(5, 2), PALETTES.ember.down);
});

test('the brush sets a disk of spins and wraps across edges', () => {
  const lat = createLattice(16, 'up');
  const changed = paintDisk(lat, 0, 0, 2, -1);
  // A radius-2 disk on the integer grid holds 13 sites.
  assert.equal(changed, 13);
  assert.equal(lat.spins[14 * 16 + 14], 1);
  assert.equal(lat.spins[15 * 16 + 0], -1);
  assert.equal(lat.spins[0 * 16 + 14], -1);
  assert.equal(paintDisk(lat, 0, 0, 2, -1), 0);
  assert.ok(magnetization(lat) < 1);
});

test('every palette keeps up and down clearly apart', () => {
  for (const p of Object.values(PALETTES)) {
    const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    assert.ok(Math.abs(lum(p.up) - lum(p.down)) > 90, p.label);
  }
});
