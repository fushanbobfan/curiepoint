import { createLattice, energy, fillLattice, magnetization } from './lattice.js';
import { ALGORITHMS, createWorkspace } from './dynamics.js';
import { CRITICAL_TEMPERATURE, clearSeries, createSeries, onsagerMagnetization, pushSample, summarize } from './observables.js';
import { PALETTES, paintDisk, paintSpins } from './render.js';
import { createRng, randomSeed } from './rng.js';

const SPEEDS = [0.25, 1, 2, 5, 10];
const WINDOW = 200;

const $ = (id) => document.getElementById(id);
const canvas = $('lattice');
const ctx = canvas.getContext('2d');

const state = {
  T: 2.27,
  h: 0,
  algorithm: 'metropolis',
  size: 128,
  speed: 1,
  palette: 'ember',
  walls: false,
  brush: 6,
  running: true,
  sweeps: 0,
  sinceChange: 0,
  carry: 0,
};

const rng = createRng(randomSeed());
let lattice = createLattice(state.size, 'random', rng);
let ws = createWorkspace(state.size);
let image = ctx.createImageData(state.size, state.size);
const series = createSeries(600);

function resize(size) {
  state.size = size;
  lattice = createLattice(size, 'random', rng);
  ws = createWorkspace(size);
  canvas.width = size;
  canvas.height = size;
  image = ctx.createImageData(size, size);
  restartMeasurements();
}

function restartMeasurements() {
  state.sinceChange = 0;
}

function sweepOnce() {
  ALGORITHMS[state.algorithm].sweep(lattice, ws, state.T, state.h, rng);
  state.sweeps++;
  state.sinceChange++;
  pushSample(series, magnetization(lattice), energy(lattice, state.h));
}

function draw() {
  paintSpins(lattice, image.data, PALETTES[state.palette], state.walls);
  ctx.putImageData(image, 0, 0);
}

const fmt = (x, digits = 3) => (Number.isFinite(x) ? x.toFixed(digits) : '—');

function updateReadouts() {
  $('temp-value').textContent = `T = ${state.T.toFixed(2)}  (T/Tc = ${(state.T / CRITICAL_TEMPERATURE).toFixed(3)})`;
  $('field-value').textContent = `h = ${state.h.toFixed(2)}`;
  $('speed-value').textContent = String(state.speed);
  $('brush-value').textContent = String(state.brush);
}

function updateStats() {
  $('stat-m').textContent = fmt(magnetization(lattice));
  $('stat-e').textContent = fmt(energy(lattice, state.h));
  $('stat-onsager').textContent = state.h === 0 ? fmt(onsagerMagnetization(state.T)) : 'h ≠ 0';
  const r = summarize(series, Math.min(WINDOW, state.sinceChange), lattice.spins.length, state.T);
  $('stat-absm').textContent = r ? fmt(r.absM) : '—';
  $('stat-chi').textContent = r && r.samples >= 20 ? fmt(r.chi, 2) : '—';
  $('stat-heat').textContent = r && r.samples >= 20 ? fmt(r.heat, 2) : '—';
  const where = state.T < CRITICAL_TEMPERATURE ? 'ordered side' : 'disordered side';
  $('status').textContent = `Sweep ${state.sweeps.toLocaleString()} · ${where}${state.running ? '' : ' · paused'}`;
}

function frame() {
  if (state.running) {
    state.carry += state.speed;
    while (state.carry >= 1) {
      sweepOnce();
      state.carry -= 1;
    }
  }
  draw();
  updateStats();
  requestAnimationFrame(frame);
}

// Controls

function fillSelect(select, entries, value) {
  for (const [key, { label }] of Object.entries(entries)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = label;
    select.append(opt);
  }
  select.value = value;
}

fillSelect($('algorithm'), ALGORITHMS, state.algorithm);
fillSelect($('palette'), PALETTES, state.palette);

function setTemperature(T) {
  state.T = T;
  $('temp').value = String(T);
  restartMeasurements();
  updateReadouts();
}

$('temp').addEventListener('input', (e) => setTemperature(Number(e.target.value)));
$('to-tc').addEventListener('click', () => setTemperature(Math.round(CRITICAL_TEMPERATURE * 100) / 100));
$('quench').addEventListener('click', () => {
  fillLattice(lattice, 'random', rng);
  setTemperature(1);
});

function setField(h) {
  state.h = h;
  $('field').value = String(h);
  restartMeasurements();
  updateReadouts();
}

$('field').addEventListener('input', (e) => setField(Number(e.target.value)));
$('field-zero').addEventListener('click', () => setField(0));

$('algorithm').addEventListener('change', (e) => {
  state.algorithm = e.target.value;
  restartMeasurements();
});
$('size').addEventListener('change', (e) => resize(Number(e.target.value)));
$('speed').addEventListener('input', (e) => {
  state.speed = SPEEDS[Number(e.target.value)];
  updateReadouts();
});

for (const init of ['random', 'up', 'down']) {
  $(`init-${init}`).addEventListener('click', () => {
    fillLattice(lattice, init, rng);
    restartMeasurements();
  });
}

$('palette').addEventListener('change', (e) => {
  state.palette = e.target.value;
});
$('walls').addEventListener('change', (e) => {
  state.walls = e.target.checked;
});
$('brush').addEventListener('input', (e) => {
  state.brush = Number(e.target.value);
  updateReadouts();
});

function setRunning(running) {
  state.running = running;
  $('pause').textContent = running ? 'Pause' : 'Resume';
  $('pause').setAttribute('aria-pressed', String(!running));
}

$('pause').addEventListener('click', () => setRunning(!state.running));
$('step').addEventListener('click', () => {
  setRunning(false);
  sweepOnce();
});

// Brush

let painting = null;

function paintAt(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * state.size;
  const y = ((event.clientY - rect.top) / rect.height) * state.size;
  const radius = (state.brush * state.size) / 128;
  if (paintDisk(lattice, x, y, radius, painting) > 0) restartMeasurements();
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  painting = e.shiftKey || e.button === 2 ? -1 : 1;
  canvas.setPointerCapture(e.pointerId);
  paintAt(e);
});
canvas.addEventListener('pointermove', (e) => {
  if (painting !== null) paintAt(e);
});
const stopPainting = () => {
  painting = null;
};
canvas.addEventListener('pointerup', stopPainting);
canvas.addEventListener('pointercancel', stopPainting);

// Keyboard: space pauses, arrow keys nudge the temperature.
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLButtonElement) return;
  if (e.key === ' ') {
    e.preventDefault();
    setRunning(!state.running);
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    const next = state.T + (e.key === 'ArrowUp' ? 0.05 : -0.05);
    setTemperature(Math.round(Math.min(5, Math.max(0.5, next)) * 100) / 100);
  }
});

clearSeries(series);
updateReadouts();
requestAnimationFrame(frame);
