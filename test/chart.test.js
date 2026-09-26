import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAD, formatTick, linear, niceRange, tracePoints } from '../src/chart.js';
import { createSeries, pushSample } from '../src/observables.js';

test('linear maps the domain ends onto the range ends', () => {
  const f = linear(-1, 1, 100, 0);
  assert.equal(f(-1), 100);
  assert.equal(f(1), 0);
  assert.equal(f(0), 50);
  assert.equal(linear(2, 2, 0, 10)(2), 0);
});

test('trace points fill from the right and reach the left edge when full', () => {
  const s = createSeries(5);
  pushSample(s, 1, -2);
  pushSample(s, -1, 2);
  let pts = tracePoints(s, 'm', 100, 60, -1, 1);
  assert.equal(pts.length, 4);
  assert.equal(pts[2], 100 - PAD.right);
  assert.equal(pts[1], PAD.top);
  assert.equal(pts[3], 60 - PAD.bottom);
  for (let i = 0; i < 5; i++) pushSample(s, 0, 0);
  pts = tracePoints(s, 'e', 100, 60, -2, 2);
  assert.equal(pts[0], PAD.left);
  assert.equal(pts.length, 10);
});

test('nice ranges cover the data, respect a minimum span and skip non-numbers', () => {
  const [lo, hi] = niceRange([0.13, 0.87, NaN]);
  assert.ok(lo <= 0.13 && hi >= 0.87);
  const [a, b] = niceRange([5, 5], 2);
  assert.ok(b - a >= 2 && a <= 5 && b >= 5);
  assert.deepEqual(niceRange([], 1), [0, 1]);
  const [c, d] = niceRange([0, 83.2]);
  assert.ok(c === 0 && d >= 83.2 && d <= 90);
});

test('ticks keep a sensible number of digits', () => {
  assert.equal(formatTick(0), '0');
  assert.equal(formatTick(-1.5), '-1.50');
  assert.equal(formatTick(42.25), '42.3');
  assert.equal(formatTick(250), '250');
});
