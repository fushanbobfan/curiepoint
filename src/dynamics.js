// Monte Carlo dynamics for the Ising lattice at temperature T (k_B = J = 1).

import { neighbourTable } from './lattice.js';

// Everything a lattice needs for fast updates, rebuilt only when the size changes.
export function createWorkspace(size) {
  const n = size * size;
  return {
    size,
    table: neighbourTable(size),
    stack: new Int32Array(n),
    mark: new Uint32Array(n),
    stamp: 0,
  };
}

// Acceptance probabilities exp(-dE / T) for every possible spin flip.
// dE = 2 s (sum of neighbours + h); s * sum takes the values -4, -2, 0, 2, 4.
export function acceptanceTable(T, h) {
  const table = new Float64Array(10);
  for (let k = 0; k < 5; k++) {
    const sNeighbours = 2 * k - 4;
    for (let up = 0; up < 2; up++) {
      const s = up ? 1 : -1;
      const dE = 2 * (sNeighbours + s * h);
      table[2 * k + up] = dE <= 0 ? 1 : T > 0 ? Math.exp(-dE / T) : 0;
    }
  }
  return table;
}

// One sweep: as many single-spin attempts as there are sites. Returns the number of flips.
export function metropolisSweep(lattice, ws, T, h, rng) {
  const { spins } = lattice;
  const { table } = ws;
  const n = spins.length;
  const accept = acceptanceTable(T, h);
  let flips = 0;
  for (let step = 0; step < n; step++) {
    const i = (rng() * n) | 0;
    const s = spins[i];
    const k = 4 * i;
    const sum = spins[table[k]] + spins[table[k + 1]] + spins[table[k + 2]] + spins[table[k + 3]];
    const p = accept[(s * sum + 4) + (s > 0 ? 1 : 0)];
    if (p >= 1 || rng() < p) {
      spins[i] = -s;
      flips++;
    }
  }
  return flips;
}

// One Wolff cluster update. Aligned neighbours join with probability 1 - exp(-2/T);
// in a field the whole cluster then flips with probability min(1, exp(-2 h S / T)),
// where S is the summed spin of the cluster. Returns the cluster size, negative if rejected.
export function wolffStep(lattice, ws, T, h, rng) {
  const { spins } = lattice;
  const { table, stack, mark } = ws;
  const n = spins.length;
  const pAdd = T > 0 ? 1 - Math.exp(-2 / T) : 1;
  ws.stamp = (ws.stamp + 1) >>> 0;
  if (ws.stamp === 0) {
    mark.fill(0);
    ws.stamp = 1;
  }
  const stamp = ws.stamp;
  const seed = (rng() * n) | 0;
  const s = spins[seed];
  let top = 0;
  let count = 0;
  stack[top++] = seed;
  mark[seed] = stamp;
  const members = [];
  while (top > 0) {
    const i = stack[--top];
    members.push(i);
    count++;
    for (let d = 0; d < 4; d++) {
      const j = table[4 * i + d];
      if (mark[j] !== stamp && spins[j] === s && rng() < pAdd) {
        mark[j] = stamp;
        stack[top++] = j;
      }
    }
  }
  if (h !== 0) {
    const dE = 2 * h * s * count;
    if (dE > 0 && !(T > 0 && rng() < Math.exp(-dE / T))) return -count;
  }
  for (const i of members) spins[i] = -s;
  return count;
}

// Wolff updates until roughly one lattice's worth of spins has been visited,
// so one "sweep" costs about the same for both algorithms.
export function wolffSweep(lattice, ws, T, h, rng) {
  const n = lattice.spins.length;
  let visited = 0;
  let flipped = 0;
  let guard = 0;
  while (visited < n && guard++ < 4 * n) {
    const c = wolffStep(lattice, ws, T, h, rng);
    visited += Math.abs(c);
    if (c > 0) flipped += c;
  }
  return flipped;
}

export const ALGORITHMS = {
  metropolis: { label: 'Metropolis (single spin)', sweep: metropolisSweep },
  wolff: { label: 'Wolff (clusters)', sweep: wolffSweep },
};
