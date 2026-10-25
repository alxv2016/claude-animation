// Measures the beat grid from public/reel.wav and writes src/reel/beats.json.
// 1. Onset strength: half-wave rectified rise of low-band log energy.
// 2. Tempo + phase: grid search (90-180 BPM) maximizing onset strength on the grid.
// 3. Refine: snap each grid beat to its local onset peak, least-squares fit a line.
import fs from "node:fs";
import { SR, Biquad, readWav } from "./dsp.mjs";

const BEATS = 32;
const HOP = 0.001;
const [l, r] = readWav("public/reel.wav", fs);
const lp = new Biquad("lp", 150, 0.7);
const hop = Math.round(HOP * SR);
const env = [-100, -100, -100, -100, -100];
let acc = 0;
for (let i = 0; i < l.length; i++) {
  const v = lp.run((l[i] + r[i]) / 2);
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
for (let bpm = 90; bpm <= 180; bpm += 0.05) {
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
function fit(points) {
  const n = points.length;
  const mx = points.reduce((s, h) => s + h.k, 0) / n;
  const my = points.reduce((s, h) => s + h.t, 0) / n;
  let sxy = 0, sxx = 0;
  for (const h of points) { sxy += (h.k - mx) * (h.t - my); sxx += (h.k - mx) ** 2; }
  const period = sxy / sxx;
  return { period, offset: my - period * mx };
}
// Fit, drop beats that snapped to a neighbouring transient (> 8 ms off), refit.
let { period, offset } = fit(hits);
const inliers = hits.filter((h) => Math.abs(h.t - (offset + h.k * period)) < 0.008);
({ period, offset } = fit(inliers));
const n = inliers.length;
const residuals = inliers.map((h) => Math.abs(h.t - (offset + h.k * period)) * 1000);

const out = {
  source: "public/reel.wav",
  bpm: +(60 / period).toFixed(3),
  period: +period.toFixed(6),
  offset: +offset.toFixed(6),
  beats: Array.from({ length: BEATS }, (_, i) => +(offset + i * period).toFixed(6)),
  detectedBeats: inliers.map((h) => h.k),
  maxResidualMs: +Math.max(...residuals).toFixed(2),
};
fs.writeFileSync("src/reel/beats.json", JSON.stringify(out, null, 2) + "\n");
console.log(`${n}/${BEATS} beats detected  ${out.bpm} BPM  offset ${(offset * 1000).toFixed(1)} ms  max residual ${out.maxResidualMs} ms`);
