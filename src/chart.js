// Small canvas charts: a scrolling trace of recent sweeps and a scatter of scan
// results over an exact curve. Geometry is kept in pure helpers for testing.

import { sampleAt } from './observables.js';

export const PAD = { left: 38, right: 8, top: 8, bottom: 20 };

export function linear(d0, d1, r0, r1) {
  const span = d1 - d0 || 1;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

// Pixel coordinates for the newest `series.capacity` samples of one quantity,
// oldest at the left edge so the trace scrolls as it fills.
export function tracePoints(series, key, width, height, lo, hi) {
  const x = linear(0, series.capacity - 1, PAD.left, width - PAD.right);
  const y = linear(lo, hi, height - PAD.bottom, PAD.top);
  const offset = series.capacity - series.length;
  const pts = new Float32Array(series.length * 2);
  for (let i = 0; i < series.length; i++) {
    pts[2 * i] = x(offset + i);
    pts[2 * i + 1] = y(sampleAt(series, i)[key]);
  }
  return pts;
}

// "Nice" axis range covering every value, never narrower than minSpan.
export function niceRange(values, minSpan = 1) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (lo === Infinity) return [0, minSpan];
  if (hi - lo < minSpan) {
    const mid = (hi + lo) / 2;
    lo = mid - minSpan / 2;
    hi = mid + minSpan / 2;
  }
  const step = 10 ** Math.floor(Math.log10(hi - lo)) / 2;
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}

function frame(ctx, width, height, colours) {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = colours.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(PAD.left + 0.5, PAD.top + 0.5, width - PAD.left - PAD.right - 1, height - PAD.top - PAD.bottom - 1);
  ctx.fillStyle = colours.text;
  ctx.font = '11px system-ui, sans-serif';
}

function yLabels(ctx, lo, hi, height) {
  const y = linear(lo, hi, height - PAD.bottom, PAD.top);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const v of [lo, (lo + hi) / 2, hi]) ctx.fillText(formatTick(v), PAD.left - 4, y(v));
}

export function formatTick(v) {
  if (Math.abs(v) < 1e-9) return '0';
  const a = Math.abs(v);
  return a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2);
}

function polyline(ctx, pts, colour, width = 1.5) {
  if (pts.length < 4) return;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.stroke();
}

// Magnetization (-1..1) and energy per spin (-2..2 in general) share one frame.
export function drawTrace(ctx, series, width, height, colours) {
  frame(ctx, width, height, colours);
  yLabels(ctx, -1, 1, height);
  const zero = linear(-1, 1, height - PAD.bottom, PAD.top)(0);
  ctx.strokeStyle = colours.grid;
  ctx.beginPath();
  ctx.moveTo(PAD.left, zero + 0.5);
  ctx.lineTo(width - PAD.right, zero + 0.5);
  ctx.stroke();
  polyline(ctx, tracePoints(series, 'e', width, height, -2, 2), colours.second, 1.25);
  polyline(ctx, tracePoints(series, 'm', width, height, -1, 1), colours.first);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colours.text;
  ctx.fillText(`last ${series.capacity} sweeps`, PAD.left, height - 5);
}

// Scatter of scan results for one quantity against temperature, with an exact
// curve when one exists and a marker at Tc.
export function drawScan(ctx, results, key, exact, tRange, width, height, colours, tc) {
  frame(ctx, width, height, colours);
  const values = results.map((p) => p[key]);
  if (exact) for (let i = 0; i <= 40; i++) values.push(exact(tRange[0] + ((tRange[1] - tRange[0]) * i) / 40));
  const [lo, hi] = niceRange(values, key === 'absM' ? 1 : 0.5);
  const x = linear(tRange[0], tRange[1], PAD.left, width - PAD.right);
  const y = linear(lo, hi, height - PAD.bottom, PAD.top);
  yLabels(ctx, lo, hi, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const t of [tRange[0], tc, tRange[1]]) ctx.fillText(t === tc ? 'Tc' : t.toFixed(1), x(t), height - 5);
  ctx.strokeStyle = colours.grid;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x(tc) + 0.5, PAD.top);
  ctx.lineTo(x(tc) + 0.5, height - PAD.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  if (exact) {
    const n = 200;
    const pts = new Float32Array(2 * (n + 1));
    for (let i = 0; i <= n; i++) {
      const t = tRange[0] + ((tRange[1] - tRange[0]) * i) / n;
      pts[2 * i] = x(t);
      pts[2 * i + 1] = y(exact(t));
    }
    polyline(ctx, pts, colours.second, 1.25);
  }
  ctx.fillStyle = colours.first;
  for (const p of results) {
    ctx.beginPath();
    ctx.arc(x(p.T), y(p[key]), 3, 0, 2 * Math.PI);
    ctx.fill();
  }
}
