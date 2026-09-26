// Temperature scan: step through a list of temperatures, let the lattice settle
// at each one, then average the observables. Driven one sweep at a time so the
// page can keep drawing while it runs.

import { energy, magnetization } from './lattice.js';

export function scanTemperatures(from, to, points) {
  if (points < 2) return [from];
  const out = [];
  for (let i = 0; i < points; i++) out.push(from + ((to - from) * i) / (points - 1));
  return out;
}

export function createScan({ from = 4, to = 1, points = 31, settle = 100, measure = 200 } = {}) {
  return {
    temperatures: scanTemperatures(from, to, points),
    settle,
    measure,
    index: 0,
    sweep: 0,
    sums: null,
    results: [],
    done: false,
  };
}

export function currentTemperature(scan) {
  return scan.temperatures[Math.min(scan.index, scan.temperatures.length - 1)];
}

export function scanProgress(scan) {
  const per = scan.settle + scan.measure;
  return Math.min(1, (scan.index * per + scan.sweep) / (scan.temperatures.length * per));
}

// Runs one sweep of the scan. `sweep(T)` must advance the lattice by one sweep
// at temperature T. Returns the finished point when a temperature completes.
export function stepScan(scan, lattice, h, sweep) {
  if (scan.done) return null;
  const T = currentTemperature(scan);
  sweep(T);
  scan.sweep++;
  if (scan.sweep <= scan.settle) return null;
  if (!scan.sums) scan.sums = { absM: 0, m2: 0, e: 0, e2: 0 };
  const m = magnetization(lattice);
  const e = energy(lattice, h);
  const s = scan.sums;
  s.absM += Math.abs(m);
  s.m2 += m * m;
  s.e += e;
  s.e2 += e * e;
  if (scan.sweep < scan.settle + scan.measure) return null;

  const n = scan.measure;
  const N = lattice.spins.length;
  const absM = s.absM / n;
  const eMean = s.e / n;
  const point = {
    T,
    absM,
    e: eMean,
    chi: (N * Math.max(0, s.m2 / n - absM * absM)) / T,
    heat: (N * Math.max(0, s.e2 / n - eMean * eMean)) / (T * T),
  };
  scan.results.push(point);
  scan.index++;
  scan.sweep = 0;
  scan.sums = null;
  if (scan.index >= scan.temperatures.length) scan.done = true;
  return point;
}
