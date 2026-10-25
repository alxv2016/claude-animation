// A modelled acoustic piano note: no samples. Each partial is a stiff-string overtone
// (slightly sharp, more so in the treble), struck at 1/8 of the string, sounded by two
// detuned strings that beat against each other, with a fast "prompt" decay over a slow
// aftersound, a felt-hammer thump, and a damper on release. Velocity sets loudness and
// brightness. Oscillators are rotating phasors: one multiply-add per partial per sample.
import { SR } from "./dsp.mjs";

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/**
 * Writes one note. `write`/`send` add a stereo sample at an absolute sample index to the dry
 * bus and the reverb bus; `rand` is the session's seeded generator (so renders are identical).
 */
export function pianoVoice({ t0, note, velocity = 0.7, len = 1, pan, rand, write, send, sendLevel = 0.28 }) {
  const v = clamp(velocity, 0.05, 1);
  const f0 = 440 * 2 ** ((note - 69) / 12);
  // Stiffness: inharmonicity coefficient grows toward the treble.
  const B = 6e-5 * 2 ** ((note - 48) / 12);
  // Fundamental's aftersound time constant: long in the bass, short in the treble.
  const sustain = clamp(10 * 2 ** (-(note - 21) / 17), 0.35, 10);
  const partials = clamp(Math.floor(9000 / f0), 1, 18);
  const ring = Math.min(len, sustain * 4); // how long the key can usefully be held
  const total = ring + 0.6;
  const n = Math.round(total * SR);
  const start = Math.round(t0 * SR);
  const p = pan ?? clamp((note - 60) / 40, -0.6, 0.6);
  const gl = Math.cos(((p + 1) * Math.PI) / 4);
  const gr = Math.sin(((p + 1) * Math.PI) / 4);

  // Oscillator bank: per partial, two strings; state is (x, y) rotated by (c, s) each sample.
  const osc = [];
  for (let k = 1; k <= partials; k++) {
    const fk = k * f0 * Math.sqrt(1 + B * k * k);
    if (fk > 15000) break;
    const strike = Math.abs(Math.sin(Math.PI * k * 0.125)); // hammer at 1/8: weakens the 8th partial
    const amp = (strike / k ** (1.45 - 0.75 * v)) * (k === 1 ? 1 : 0.9);
    const tau = sustain / (1 + 0.55 * (k - 1));
    for (const cents of [-1, 1]) {
      const detune = cents * (0.12 + 0.3 * rand()); // cents
      const w = (2 * Math.PI * fk * 2 ** (detune / 1200)) / SR;
      // The hammer strikes every string at once, from rest: all phasors start in phase at zero.
      osc.push({ x: 1, y: 0, c: Math.cos(w), s: Math.sin(w), amp: amp * 0.5, tau });
    }
  }

  const gain = 0.16 * v ** 1.25;
  const releaseAt = Math.round(ring * SR);
  let thumpLp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let sum = 0;
    for (const o of osc) {
      const x = o.x * o.c - o.y * o.s;
      o.y = o.x * o.s + o.y * o.c;
      o.x = x;
      // Two-stage decay: 60 % prompt sound (fast), 40 % aftersound (slow).
      sum += o.y * o.amp * (0.6 * Math.exp(-t / (o.tau * 0.22)) + 0.4 * Math.exp(-t / o.tau));
    }
    const attack = Math.min(1, t / 0.0015);
    const damper = i < releaseAt ? 1 : Math.exp(-(i - releaseAt) / (0.11 * SR));
    // Felt hammer: a short low-passed noise thump, brighter when struck harder.
    let thump = 0;
    if (t < 0.012) {
      const a = 1 - Math.exp((-2 * Math.PI * (900 + 5000 * v)) / SR);
      thumpLp += a * (rand() * 2 - 1 - thumpLp);
      thump = thumpLp * Math.exp(-t / 0.002) * 0.35 * v;
    }
    const out = (sum * attack * damper + thump) * gain;
    write(start + i, out * gl, out * gr);
    send(start + i, out * gl * sendLevel, out * gr * sendLevel);
  }
}
