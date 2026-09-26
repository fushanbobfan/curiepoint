// Square lattice of Ising spins (+1 / -1) with periodic boundaries.
// Energy uses J = 1 and k_B = 1: E = -sum_<ij> s_i s_j - h sum_i s_i.

export function createLattice(size, init = 'random', rng = Math.random) {
  const spins = new Int8Array(size * size);
  fillLattice({ size, spins }, init, rng);
  return { size, spins };
}

export function fillLattice(lattice, init, rng = Math.random) {
  const { spins } = lattice;
  for (let i = 0; i < spins.length; i++) {
    if (init === 'up') spins[i] = 1;
    else if (init === 'down') spins[i] = -1;
    else spins[i] = rng() < 0.5 ? 1 : -1;
  }
}

// Precomputed neighbour indices: right, left, down, up for every site.
export function neighbourTable(size) {
  const n = size * size;
  const table = new Int32Array(n * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      table[4 * i] = y * size + ((x + 1) % size);
      table[4 * i + 1] = y * size + ((x - 1 + size) % size);
      table[4 * i + 2] = ((y + 1) % size) * size + x;
      table[4 * i + 3] = ((y - 1 + size) % size) * size + x;
    }
  }
  return table;
}

export function neighbourSum(lattice, i, table) {
  const s = lattice.spins;
  const k = 4 * i;
  return s[table[k]] + s[table[k + 1]] + s[table[k + 2]] + s[table[k + 3]];
}

export function magnetization(lattice) {
  let m = 0;
  for (const s of lattice.spins) m += s;
  return m / lattice.spins.length;
}

// Energy per spin. Each bond is counted once through the right and down neighbours.
export function energy(lattice, h = 0) {
  const { size, spins } = lattice;
  let bonds = 0;
  let total = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = spins[y * size + x];
      bonds += s * (spins[y * size + ((x + 1) % size)] + spins[((y + 1) % size) * size + x]);
      total += s;
    }
  }
  return (-bonds - h * total) / spins.length;
}
