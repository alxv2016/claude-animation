// Measures a beat grid from audio (studio rule R14: picture follows the measured grid).
// 1. Onset strength: half-wave rectified rise of log energy — the kick band ("low") or the whole
//    spectrum ("full", for scores without drums, such as piano).
// 2. Tempo + phase: grid search over a BPM range, maximizing onset strength on the grid.
// 3. Refine: snap each grid beat to its local onset peak, least-squares fit a line, drop beats more
//    than 8 ms off (neighbouring transients), refit.
// 4. For a supplied track: downbeats (the bar phase whose beats hit hardest — big moments go there)
//    and onsets (full-band transients — UI sounds and small hits can land on them).
import fs from "node:fs";
import { SR, Biquad, readWav } from "./dsp.mjs";

const HOP = 0.001;
const PAD = 5;

/** Onset strength every 1 ms: the rise of log energy over 5 ms in one band, half-wave rectified. */
function onsetStrength(l, r, band) {
  const filter = band === "low" ? new Biquad("lp", 150, 0.7) : new Biquad("hp", 40, 0.7);
  const hop = Math.round(HOP * SR);
  const env = [-100, -100, -100, -100, -100];
  let acc = 0;
  for (let i = 0; i < l.length; i++) {
    const v = filter.run((l[i] + r[i]) / 2);
    acc += v * v;
    if ((i + 1) % hop === 0) {
      env.push(10 * Math.log10(acc / hop + 1e-10));
      acc = 0;
    }
  }
  return env.map((e, i) => (i < 5 ? 0 : Math.max(0, e - env[i - 5])));
}

export function measureBeats(file, { beats, band = "low", minBpm = 90, maxBpm = 180, source = file, beatsPerBar = 4, details = false } = {}) {
  const [l, r] = readWav(file, fs);
  const ose = onsetStrength(l, r, band);
  const at = (t) => ose[Math.round(t / HOP) + PAD] ?? 0;
  const peakNear = (t, w) => {
    let best = t, bestV = -1;
    for (let x = t - w; x <= t + w; x += HOP) if (at(x) > bestV) { bestV = at(x); best = x; }
    return { t: best, v: bestV };
  };

  const duration = l.length / SR;
  let best = { score: -1 };
  for (let bpm = minBpm; bpm <= maxBpm; bpm += 0.05) {
    const period = 60 / bpm;
    for (let phase = 0; phase < period; phase += HOP * 2) {
      let score = 0, count = 0;
      for (let t = phase; t < duration; t += period, count++) score += peakNear(t, 0.003).v;
      score /= count;
      if (score > best.score) best = { score, period, phase };
    }
  }

  const first = best.phase - Math.floor(best.phase / best.period) * best.period;
  const hits = [];
  for (let k = 0; first + k * best.period < duration; k++) {
    const p = peakNear(first + k * best.period, 0.03);
    if (p.v > 10) hits.push({ k, t: p.t });
  }
  if (hits.length < 2) throw new Error(`no beat grid found in ${file}: too few onsets (try --band full or a wider BPM range)`);
  const fit = (points) => {
    const n = points.length;
    const mx = points.reduce((s, h) => s + h.k, 0) / n;
    const my = points.reduce((s, h) => s + h.t, 0) / n;
    let sxy = 0, sxx = 0;
    for (const h of points) { sxy += (h.k - mx) * (h.t - my); sxx += (h.k - mx) ** 2; }
    const period = sxy / sxx;
    return { period, offset: my - period * mx };
  };
  let { period, offset } = fit(hits);
  const inliers = hits.filter((h) => Math.abs(h.t - (offset + h.k * period)) < 0.008);
  ({ period, offset } = fit(inliers.length >= 2 ? inliers : hits));
  const kept = inliers.length >= 2 ? inliers : hits;
  const residuals = kept.map((h) => Math.abs(h.t - (offset + h.k * period)) * 1000);
  const count = beats ?? Math.floor((duration - offset) / period) + 1;

  const grid = {
    source,
    bpm: +(60 / period).toFixed(3),
    period: +period.toFixed(6),
    offset: +offset.toFixed(6),
    beats: Array.from({ length: count }, (_, i) => +(offset + i * period).toFixed(6)),
    detectedBeats: kept.map((h) => h.k).filter((k) => k < count),
    maxResidualMs: +Math.max(...residuals).toFixed(2),
  };
  if (!details) return grid;

  // Downbeats: the phase of the bar whose beats carry the most onset strength.
  const strength = (k) => peakNear(offset + k * period, 0.02).v;
  let phase = 0, bestSum = -1;
  for (let p = 0; p < beatsPerBar; p++) {
    let sum = 0;
    for (let k = p; k < count; k += beatsPerBar) sum += strength(k);
    if (sum > bestSum) { bestSum = sum; phase = p; }
  }
  // Onsets: full-band peaks at least 80 ms apart and well above the track's typical rise.
  const full = band === "full" ? ose : onsetStrength(l, r, "full");
  const sorted = [...full].sort((a, b) => a - b);
  const floor = Math.max(6, sorted[Math.floor(sorted.length * 0.995)] * 0.5);
  const onsets = [];
  for (let i = PAD + 1; i < full.length - 1; i++) {
    if (full[i] < floor || full[i] < full[i - 1] || full[i] < full[i + 1]) continue;
    const t = (i - PAD) * HOP;
    if (onsets.length && t - onsets.at(-1) < 0.08) continue;
    onsets.push(+t.toFixed(3));
  }
  return { ...grid, downbeats: grid.beats.filter((_, k) => k % beatsPerBar === phase), onsets };
}
