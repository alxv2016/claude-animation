// Measures a beat grid from audio (studio rule R14: picture follows the measured grid).
// 1. Onset strength: half-wave rectified rise of log energy — the kick band ("low") or the whole
//    spectrum ("full", for scores without drums, such as piano).
// 2. Tempo + phase: grid search over a BPM range, maximizing onset strength on the grid.
// 3. Refine: snap each grid beat to its local onset peak, least-squares fit a line, drop beats more
//    than 8 ms off (neighbouring transients), refit.
import fs from "node:fs";
import { SR, Biquad, readWav } from "./dsp.mjs";

const HOP = 0.001;

export function measureBeats(file, { beats, band = "low", minBpm = 90, maxBpm = 180, source = file } = {}) {
  const [l, r] = readWav(file, fs);
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
  const PAD = 5;
  const ose = env.map((e, i) => (i < 5 ? 0 : Math.max(0, e - env[i - 5])));
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

  return {
    source,
    bpm: +(60 / period).toFixed(3),
    period: +period.toFixed(6),
    offset: +offset.toFixed(6),
    beats: Array.from({ length: count }, (_, i) => +(offset + i * period).toFixed(6)),
    detectedBeats: kept.map((h) => h.k).filter((k) => k < count),
    maxResidualMs: +Math.max(...residuals).toFixed(2),
  };
}
