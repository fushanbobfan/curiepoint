// Measurements over a window of recent sweeps, plus Onsager's exact results
// for the infinite 2D lattice to compare against.

export const CRITICAL_TEMPERATURE = 2 / Math.log(1 + Math.SQRT2);

// Spontaneous magnetization per spin of the infinite lattice at h = 0.
export function onsagerMagnetization(T) {
  if (T <= 0) return 1;
  if (T >= CRITICAL_TEMPERATURE) return 0;
  const s = Math.sinh(2 / T);
  return Math.pow(1 - Math.pow(s, -4), 1 / 8);
}

// Fixed-length history of magnetization and energy per spin.
export function createSeries(capacity = 600) {
  return { capacity, m: new Float64Array(capacity), e: new Float64Array(capacity), start: 0, length: 0 };
}

export function pushSample(series, m, e) {
  const { capacity } = series;
  const at = (series.start + series.length) % capacity;
  series.m[at] = m;
  series.e[at] = e;
  if (series.length < capacity) series.length++;
  else series.start = (series.start + 1) % capacity;
}

export function clearSeries(series) {
  series.start = 0;
  series.length = 0;
}

// The i-th oldest sample still held.
export function sampleAt(series, i) {
  const k = (series.start + i) % series.capacity;
  return { m: series.m[k], e: series.e[k] };
}

// Averages over the last `count` samples. Susceptibility and heat capacity are
// per spin, from the fluctuations: chi = N (<m^2> - <|m|>^2) / T, C = N (<e^2> - <e>^2) / T^2.
export function summarize(series, count, spins, T) {
  const n = Math.min(count, series.length);
  if (n === 0) return null;
  let am = 0;
  let m1 = 0;
  let m2 = 0;
  let e1 = 0;
  let e2 = 0;
  for (let i = series.length - n; i < series.length; i++) {
    const { m, e } = sampleAt(series, i);
    m1 += m;
    am += Math.abs(m);
    m2 += m * m;
    e1 += e;
    e2 += e * e;
  }
  am /= n;
  m1 /= n;
  m2 /= n;
  e1 /= n;
  e2 /= n;
  return {
    samples: n,
    m: m1,
    absM: am,
    e: e1,
    chi: T > 0 ? (spins * Math.max(0, m2 - am * am)) / T : 0,
    heat: T > 0 ? (spins * Math.max(0, e2 - e1 * e1)) / (T * T) : 0,
  };
}
