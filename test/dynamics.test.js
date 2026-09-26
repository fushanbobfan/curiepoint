import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLattice, energy, magnetization } from '../src/lattice.js';
import { acceptanceTable, createWorkspace, metropolisSweep, wolffStep, wolffSweep } from '../src/dynamics.js';
import { createRng } from '../src/rng.js';

const TC = 2 / Math.log(1 + Math.SQRT2);

function average(algorithm, size, T, h, burn, measure, seed = 3) {
  const rng = createRng(seed);
  const lat = createLattice(size, 'up', rng);
  const ws = createWorkspace(size);
  for (let i = 0; i < burn; i++) algorithm(lat, ws, T, h, rng);
  let m = 0;
  let e = 0;
  for (let i = 0; i < measure; i++) {
    algorithm(lat, ws, T, h, rng);
    m += Math.abs(magnetization(lat));
    e += energy(lat, h);
  }
  return { m: m / measure, e: e / measure };
}

test('acceptance is 1 for downhill flips and the Boltzmann factor uphill', () => {
  const t = acceptanceTable(2, 0);
  // s * neighbours = -4: flipping gains energy -8, always accepted.
  assert.equal(t[0], 1);
  assert.equal(t[1], 1);
  // s * neighbours = +4: dE = 8.
  assert.ok(Math.abs(t[8] - Math.exp(-4)) < 1e-12);
  // A field that favours the current spin makes flipping it harder.
  const f = acceptanceTable(2, 1);
  assert.ok(f[5] < f[4]);
});

test('at zero temperature Metropolis never raises the energy', () => {
  const rng = createRng(11);
  const lat = createLattice(16, 'random', rng);
  const ws = createWorkspace(16);
  let last = energy(lat);
  for (let i = 0; i < 20; i++) {
    metropolisSweep(lat, ws, 0, 0, rng);
    const e = energy(lat);
    assert.ok(e <= last + 1e-12);
    last = e;
  }
});

test('Metropolis stays ordered well below Tc and disorders well above it', () => {
  const cold = average(metropolisSweep, 16, 1.5, 0, 200, 300);
  assert.ok(cold.m > 0.95, `cold |m| = ${cold.m}`);
  const hot = average(metropolisSweep, 16, 5, 0, 200, 300);
  assert.ok(hot.m < 0.2, `hot |m| = ${hot.m}`);
});

test('both algorithms agree with the exact energy at Tc on a large lattice', () => {
  // Onsager: at Tc the energy per spin is -sqrt(2) in the thermodynamic limit.
  const met = average(metropolisSweep, 32, TC, 0, 300, 400);
  const wolff = average(wolffSweep, 32, TC, 0, 100, 400);
  assert.ok(Math.abs(met.e + Math.SQRT2) < 0.06, `Metropolis e = ${met.e}`);
  assert.ok(Math.abs(wolff.e + Math.SQRT2) < 0.06, `Wolff e = ${wolff.e}`);
  assert.ok(Math.abs(met.e - wolff.e) < 0.05);
});

test('a Wolff cluster at zero temperature is the whole aligned domain', () => {
  const lat = createLattice(8, 'up');
  const ws = createWorkspace(8);
  const size = wolffStep(lat, ws, 0, 0, createRng(1));
  assert.equal(size, 64);
  assert.equal(magnetization(lat), -1);
});

test('a strong opposing field rejects cluster flips toward it', () => {
  const lat = createLattice(8, 'up');
  const ws = createWorkspace(8);
  const rng = createRng(5);
  for (let i = 0; i < 20; i++) assert.ok(wolffStep(lat, ws, 0.5, 2, rng) < 0);
  assert.equal(magnetization(lat), 1);
});

test('a field polarises the lattice above Tc under both algorithms', () => {
  const met = average(metropolisSweep, 16, 3, 0.5, 200, 200);
  const wolff = average(wolffSweep, 16, 3, 0.5, 100, 200);
  assert.ok(met.m > 0.4 && wolff.m > 0.4);
  assert.ok(Math.abs(met.m - wolff.m) < 0.08, `${met.m} vs ${wolff.m}`);
});
