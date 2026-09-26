import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CRITICAL_TEMPERATURE, clearSeries, createSeries, onsagerMagnetization, pushSample, sampleAt, summarize,
} from '../src/observables.js';

test('the critical temperature is 2 / ln(1 + sqrt 2) ≈ 2.269', () => {
  assert.ok(Math.abs(CRITICAL_TEMPERATURE - 2.269185) < 1e-6);
});

test('Onsager magnetization falls from 1 to 0 at Tc and stays 0 above', () => {
  assert.equal(onsagerMagnetization(0), 1);
  assert.ok(onsagerMagnetization(1) > 0.999);
  assert.ok(Math.abs(onsagerMagnetization(2) - 0.911319) < 1e-5);
  assert.ok(onsagerMagnetization(CRITICAL_TEMPERATURE - 1e-4) < 0.4);
  assert.equal(onsagerMagnetization(CRITICAL_TEMPERATURE), 0);
  assert.equal(onsagerMagnetization(3), 0);
  let last = 1;
  for (let T = 0.5; T < CRITICAL_TEMPERATURE; T += 0.05) {
    const m = onsagerMagnetization(T);
    assert.ok(m <= last);
    last = m;
  }
});

test('the series keeps the newest samples in order once full', () => {
  const s = createSeries(4);
  for (let i = 1; i <= 6; i++) pushSample(s, i, -i);
  assert.equal(s.length, 4);
  assert.deepEqual([0, 1, 2, 3].map((i) => sampleAt(s, i).m), [3, 4, 5, 6]);
  clearSeries(s);
  assert.equal(s.length, 0);
  assert.equal(summarize(s, 10, 1, 1), null);
});

test('summaries use only the requested window and read fluctuations', () => {
  const s = createSeries(10);
  pushSample(s, 0.9, -1.9);
  for (let i = 0; i < 4; i++) pushSample(s, i % 2 ? 0.5 : -0.5, i % 2 ? -1 : -2);
  const r = summarize(s, 4, 100, 2);
  assert.equal(r.samples, 4);
  assert.equal(r.m, 0);
  assert.equal(r.absM, 0.5);
  assert.equal(r.e, -1.5);
  // <m^2> - <|m|>^2 = 0: flipping sign alone is not a fluctuation of |m|.
  assert.equal(r.chi, 0);
  // Var(e) = 0.25, so C = 100 * 0.25 / 4.
  assert.ok(Math.abs(r.heat - 6.25) < 1e-12);
});
