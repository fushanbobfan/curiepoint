// Turns spins into pixels. Pure functions over typed arrays so they run in tests.

export const PALETTES = {
  ember: { label: 'Ember and ink', up: [242, 166, 90], down: [34, 40, 74], wall: [255, 244, 214] },
  tide: { label: 'Blue and gold (colour-blind safe)', up: [240, 200, 60], down: [30, 90, 170], wall: [255, 255, 255] },
  mono: { label: 'Black and white', up: [238, 238, 238], down: [22, 22, 22], wall: [220, 60, 60] },
};

// Writes one RGBA pixel per site. With `walls` on, sites that disagree with a
// neighbour to the right or below are drawn in the wall colour to outline domains.
export function paintSpins(lattice, rgba, palette, walls = false) {
  const { size, spins } = lattice;
  const { up, down, wall } = palette;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const s = spins[i];
      let c = s > 0 ? up : down;
      if (walls && (spins[y * size + ((x + 1) % size)] !== s || spins[((y + 1) % size) * size + x] !== s)) c = wall;
      const k = 4 * i;
      rgba[k] = c[0];
      rgba[k + 1] = c[1];
      rgba[k + 2] = c[2];
      rgba[k + 3] = 255;
    }
  }
}

// Sets every site within `radius` of (cx, cy), in lattice units, to `value`.
// The disk wraps across the periodic edges like the lattice itself.
export function paintDisk(lattice, cx, cy, radius, value) {
  const { size, spins } = lattice;
  const r = Math.max(0.5, radius);
  let changed = 0;
  for (let dy = Math.ceil(-r); dy <= Math.floor(r); dy++) {
    for (let dx = Math.ceil(-r); dx <= Math.floor(r); dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = (((Math.floor(cx) + dx) % size) + size) % size;
      const y = (((Math.floor(cy) + dy) % size) + size) % size;
      const i = y * size + x;
      if (spins[i] !== value) {
        spins[i] = value;
        changed++;
      }
    }
  }
  return changed;
}
