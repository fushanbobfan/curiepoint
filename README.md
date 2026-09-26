# curiepoint

The two-dimensional Ising model in the browser. A square lattice of magnetic
spins, each pointing up or down, jostled by heat. Cool it below the critical
temperature and domains grow until one direction wins; heat it and the order
dissolves. Then run a temperature scan and compare what the lattice measures
with Onsager's exact solution.

**Live demo:** https://fushanbobfan.github.io/curiepoint/

No build step and no dependencies. The lattice, update rules, measurements,
scan and chart geometry are plain ES modules covered by a Node test suite;
only `src/main.js` touches the DOM.

## Quick start

Open `index.html` through any static server, or run:

```bash
npm run serve
# then visit http://localhost:8080
```

Run the tests with `npm test` (Node 20 or newer).

## Things to try

- **Set to Tc** and watch domains of every size appear and dissolve. Turn on
  *Outline domain walls* to see their boundaries.
- **Quench to 1.0** from a random start. Domains coarsen slowly under
  single-spin updates; switch to Wolff and the lattice orders almost at once.
- Paint a large blob of down spins into an ordered up lattice below Tc and
  watch it shrink, then add a small field that favours it and watch it grow.
- **Cool from 4.0 to 1.0** with the Wolff rule. Plot ⟨|m|⟩ and energy against
  the exact curves, then susceptibility and heat capacity to see the peaks
  near Tc. Bigger lattices give sharper peaks closer to 2.269.

## How it works

**Model.** Each site holds s = ±1. With coupling J = 1, Boltzmann's constant
k_B = 1 and field h, the energy is E = −Σ s_i s_j − h Σ s_i, the first sum over
nearest-neighbour pairs. Edges are periodic, so the lattice is a torus.

**Metropolis.** A sweep makes one attempt per site at random. Flipping s costs
ΔE = 2s(n + h), where n is the sum of the four neighbours. The flip is taken
when ΔE ≤ 0 and otherwise with probability exp(−ΔE/T), read from a table of
the ten possible values.

**Wolff.** A cluster grows from a random seed, adding aligned neighbours with
probability 1 − exp(−2/T), and flips as a whole. This avoids the critical
slowing down that makes single-spin updates crawl near Tc. With a field, the
cluster is then flipped with probability min(1, exp(−2hS/T)), where S is its
summed spin, which keeps detailed balance. One Wolff "sweep" runs clusters
until about as many spins as the lattice holds have been visited.

**Measurements.** Magnetization and energy per spin are recorded after every
sweep. Over a window of recent sweeps the page reports ⟨|m|⟩, the
susceptibility χ = N(⟨m²⟩ − ⟨|m|⟩²)/T and the heat capacity
C = N(⟨e²⟩ − ⟨e⟩²)/T², all per spin. The window restarts whenever a setting
changes, so it never mixes two temperatures.

**Exact results.** For the infinite lattice at h = 0, Onsager's solution gives
Tc = 2/ln(1 + √2) ≈ 2.269, the spontaneous magnetization
m = (1 − sinh⁻⁴(2/T))^(1/8) below Tc, and the energy per spin
u = −coth(2/T)·[1 + (2/π)(2tanh²(2/T) − 1)·K(k)] with
k = 2sinh(2/T)/cosh²(2/T). The complete elliptic integral K is computed with
the arithmetic-geometric mean. At Tc, K diverges while its prefactor vanishes,
leaving u = −√2.

**Scan.** A scan steps from T = 4 down to T = 1, carrying the lattice from one
temperature to the next. At each temperature it spends 100 sweeps settling
and 200 measuring, and the page runs as many sweeps as fit in about 12 ms per
frame. A finite lattice rounds off the transition: |m| stays above zero past
Tc and the χ and C peaks sit a little away from 2.269, moving closer as the
lattice grows.

## Controls

| Input | Action |
| --- | --- |
| Drag on the lattice | Paint up spins |
| Shift-drag or right-drag | Paint down spins |
| Space | Pause or resume |
| ↑ / ↓ | Raise or lower the temperature by 0.05 |

## Layout

```
index.html        page structure
style.css         layout and theme
src/lattice.js    spins, neighbours, magnetization and energy
src/dynamics.js   Metropolis and Wolff updates
src/observables.js  running measurements and Onsager's exact results
src/scan.js       temperature scan state machine
src/chart.js      chart geometry and drawing
src/render.js     spins to pixels, brush
src/rng.js        seeded random numbers
src/main.js       DOM wiring and animation loop
test/             node:test suites
```

## License

MIT
