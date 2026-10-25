// Synthesizes the 15 s reel score (128 BPM, 8 bars) into public/reel.wav,
// mastered to -14 LUFS integrated with a -1.5 dBFS peak ceiling.
// Every cue is placed on the beat grid; the video reads the *measured*
// grid back from src/reel/beats.json (see audio/beats.mjs).
import fs from "node:fs";
import { SR, Biquad, mulberry32, integratedLufs, writeWav } from "./dsp.mjs";

const BPM = 128;
const BEAT = 60 / BPM;
const DURATION = 15;
const N = Math.round(DURATION * SR);
const TARGET_LUFS = -14;
const CEILING = 10 ** (-1.5 / 20);

const rand = mulberry32(1337);
const noise = () => rand() * 2 - 1;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const beat = (b) => b * BEAT;

const main = [new Float64Array(N), new Float64Array(N)];
const pump = [new Float64Array(N), new Float64Array(N)];
const verb = [new Float64Array(N), new Float64Array(N)];
const kickTimes = [];

function write(bus, i, l, r) {
  if (i < 0 || i >= N) return;
  bus[0][i] += l;
  bus[1][i] += r;
}

function voice(t0, len, fn, { pan = 0, bus = main, send = 0 } = {}) {
  const start = Math.round(t0 * SR);
  const n = Math.round(len * SR);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let k = 0; k < n; k++) {
    const v = fn(k / SR, k);
    write(bus, start + k, v * gl, v * gr);
    if (send) write(verb, start + k, v * gl * send, v * gr * send);
  }
}

// --- instruments -----------------------------------------------------------

function kick(t0, g = 1) {
  kickTimes.push(t0);
  let phase = 0;
  voice(t0, 0.5, (t) => {
    const f = 46 + 130 * Math.exp(-t * 32);
    phase += (2 * Math.PI * f) / SR;
    const body = Math.sin(phase) * Math.exp(-t / 0.17);
    const click = t < 0.003 ? noise() * (1 - t / 0.003) * 0.5 : 0;
    return Math.tanh((body + click) * 1.6) * g;
  });
}

function clap(t0, g = 1, pan = 0.1) {
  const bp = new Biquad("bp", 1400, 0.9);
  voice(t0, 0.35, (t) => {
    let env = 0;
    for (const off of [0, 0.009, 0.018]) if (t >= off) env = Math.max(env, Math.exp(-(t - off) / 0.006));
    if (t >= 0.022) env = Math.max(env, 0.8 * Math.exp(-(t - 0.022) / 0.09));
    return bp.run(noise()) * env * 2.2 * g;
  }, { pan, send: 0.35 });
}

function hat(t0, g = 1, open = false, pan = 0) {
  const hp = new Biquad("hp", 7500, 0.8);
  voice(t0, open ? 0.3 : 0.08, (t) => hp.run(noise()) * Math.exp(-t / (open ? 0.11 : 0.022)) * g, { pan, send: 0.08 });
}

function pluck(t0, f, g = 1, pan = 0) {
  voice(t0, 1.2, (t) => {
    const idx = 2.6 * Math.exp(-t / 0.05);
    const amp = Math.min(1, t / 0.003) * Math.exp(-t / 0.32);
    return Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * 2 * t)) * amp * g;
  }, { pan, send: 0.3 });
}

function chime(t0, f, g = 1, pan = 0) {
  voice(t0, 2.2, (t) => {
    const idx = 1.8 * Math.exp(-t / 0.25);
    const amp = Math.min(1, t / 0.002) * Math.exp(-t / 0.8);
    return Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * 3.5 * t)) * amp * g;
  }, { pan, send: 0.45 });
}

function tick(t0, g = 1, f = 2600, pan = 0) {
  voice(t0, 0.05, (t) => (Math.sin(2 * Math.PI * f * t) * 0.8 + noise() * 0.2) * Math.exp(-t / 0.01) * g, { pan, send: 0.1 });
}

function bass(t0, len, f, g = 1) {
  voice(t0, len, (t) => {
    const env = Math.min(1, t / 0.006) * Math.min(1, (len - t) / 0.03);
    const x = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t);
    return Math.tanh(x * 1.4) * env * g;
  }, { bus: pump });
}

function pad(t0, len, notes, g = 1, cutoff = 1600) {
  const lps = [new Biquad("lp", cutoff, 0.9), new Biquad("lp", cutoff, 0.9)];
  const start = Math.round(t0 * SR);
  const n = Math.round(len * SR);
  const detune = [-0.11, 0, 0.09];
  const phases = notes.map(() => detune.map(() => rand()));
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.12) * Math.min(1, (len - t) / 0.25);
    let l = 0, r = 0;
    notes.forEach((m, ni) => {
      detune.forEach((d, di) => {
        const f = midi(m + d);
        phases[ni][di] = (phases[ni][di] + f / SR) % 1;
        const saw = phases[ni][di] * 2 - 1;
        if (di === 0) l += saw; else if (di === 2) r += saw; else { l += saw * 0.6; r += saw * 0.6; }
      });
    });
    const scale = (env * g) / (notes.length * 2);
    const vl = lps[0].run(l) * scale;
    const vr = lps[1].run(r) * scale;
    write(pump, start + k, vl, vr);
    write(verb, start + k, vl * 0.3, vr * 0.3);
  }
}

function impact(t0, g = 1) {
  let phase = 0;
  const lp = new Biquad("lp", 1800, 0.7);
  voice(t0, 1.9, (t) => {
    const f = 26 + 48 * Math.exp(-t * 4);
    phase += (2 * Math.PI * f) / SR;
    const boom = Math.sin(phase) * Math.exp(-t / 0.7);
    const crack = lp.run(noise()) * Math.exp(-t / 0.12) * 0.9;
    return Math.tanh((boom * 1.3 + crack) * 1.2) * g;
  }, { send: 0.5 });
}

function whoosh(t0, len, g = 1, f0 = 400, f1 = 4000, pan0 = -0.6, pan1 = 0.6) {
  const bp = new Biquad("bp", f0, 1.4);
  const start = Math.round(t0 * SR);
  const n = Math.round(len * SR);
  for (let k = 0; k < n; k++) {
    const u = k / n;
    if (k % 32 === 0) bp.set(f0 * (f1 / f0) ** u);
    const env = u < 0.75 ? (u / 0.75) ** 2 : 1 - (u - 0.75) / 0.25;
    const v = bp.run(noise()) * env * g * 1.6;
    const pan = pan0 + (pan1 - pan0) * u;
    write(main, start + k, v * Math.cos(((pan + 1) * Math.PI) / 4), v * Math.sin(((pan + 1) * Math.PI) / 4));
    write(verb, start + k, v * 0.2, v * 0.2);
  }
}

function reverseCymbal(tEnd, len, g = 1) {
  const hp = new Biquad("hp", 4500, 0.7);
  voice(tEnd - len, len, (t) => hp.run(noise()) * (t / len) ** 3 * g, { send: 0.2 });
}

function riser(t0, len, g = 1) {
  const lp = new Biquad("lp", 300, 1.2);
  let phase = 0;
  const start = Math.round(t0 * SR);
  const n = Math.round(len * SR);
  for (let k = 0; k < n; k++) {
    const u = k / n;
    if (k % 32 === 0) lp.set(300 * (9000 / 300) ** u, 1.2 + u * 3);
    phase = (phase + (110 * 2 ** (u * 2.5)) / SR) % 1;
    const v = (lp.run(noise()) * 0.8 + (phase * 2 - 1) * 0.15) * u * u * g;
    write(main, start + k, v, v);
    write(verb, start + k, v * 0.3, v * 0.3);
  }
}

// --- the score ---------------------------------------------------------------
// Bars: 0 bounce, 1 type, 2 grid, 3 data, 4 cube, 5 easing, 6 build, 7 logo.

const chords = [
  [57, 60, 64], [53, 57, 60, 64], [52, 55, 60, 64], [55, 59, 62, 66],
  [57, 60, 64, 67], [53, 57, 60, 64], [55, 60, 62, 67], [57, 64, 69, 71],
];
const roots = [33, 29, 36, 31, 33, 29, 31, 33];

// Bar 0: the ball. Soft kick on beats, one pluck per letter hit (eighths 0-5),
// a floor thud on eighth 6, then a whoosh as the ball arcs into the "o".
for (let b = 0; b < 4; b++) kick(beat(b), 0.55);
const letterNotes = [69, 72, 74, 76, 79, 81];
letterNotes.forEach((m, i) => pluck(beat(i * 0.5), midi(m), 0.5, -0.5 + i * 0.2));
pad(0, beat(4), chords[0], 0.35, 900);
whoosh(beat(3.1), beat(0.9), 0.5, 300, 5000);
reverseCymbal(beat(4), beat(1), 0.35);

// Bars 1-5: the groove.
for (let b = 4; b < 24; b++) {
  kick(beat(b), b === 4 ? 1 : 0.9);
  if (b % 2 === 1) clap(beat(b), 0.55, b % 4 === 1 ? -0.1 : 0.1);
  hat(beat(b + 0.5), 0.35, b % 4 === 3, b % 2 ? 0.3 : -0.3);
  hat(beat(b + 0.25), 0.12, false, -0.2);
  hat(beat(b + 0.75), 0.12, false, 0.2);
}
impact(beat(4), 0.75);
for (let bar = 1; bar < 6; bar++) {
  pad(beat(bar * 4), beat(4), chords[bar], 0.55, 1500 + bar * 150);
  for (let e = 0; e < 8; e++) bass(beat(bar * 4 + e * 0.5), beat(0.45), midi(roots[bar] + (e === 7 ? 12 : 0)), 0.55);
}
// Bar 1: rows snap on each beat; blinds whoosh out.
for (let b = 4; b < 8; b++) tick(beat(b), 0.25, 1800 + (b - 4) * 200);
whoosh(beat(7.2), beat(0.8), 0.45, 600, 6000, 0.6, -0.6);
// Bar 2: a ripple per beat rings a chord tone.
[76, 79, 84, 79].forEach((m, i) => chime(beat(8 + i), midi(m), 0.22, -0.3 + i * 0.2));
// Bar 3: counter ticks in sixteenths, a chime when the line draws.
for (let s = 0; s < 12; s++) tick(beat(12 + s * 0.25), 0.18, 2200 + s * 60, (s % 2 ? 0.25 : -0.25));
chime(beat(14), midi(83), 0.25, 0.2);
// Bar 4: each cube turn gets a swish into the beat.
for (let b = 16; b < 20; b++) whoosh(beat(b - 0.3), beat(0.36), 0.35, 500, 3500, b % 2 ? 0.5 : -0.5, b % 2 ? -0.5 : 0.5);
// Bar 5: arrival chimes when the easing dots land.
chime(beat(22), midi(81), 0.25, -0.2);
chime(beat(24) - 0.001, midi(88), 0.18, 0.2);

// Bar 6: the build. Kick and clap roll accelerate, then drop out for the
// final half-beat of anticipation before the impact.
pad(beat(24), beat(3.5), chords[6], 0.5, 1200);
for (let b = 24; b < 27.5; b++) kick(beat(b), 0.85);
for (let e = 0; e < 4; e++) clap(beat(24 + e * 0.5), 0.3 + e * 0.04, e % 2 ? 0.2 : -0.2);
for (let s = 0; s < 6; s++) clap(beat(26 + s * 0.25), 0.4 + s * 0.04, s % 2 ? 0.25 : -0.25);
for (let e = 0; e < 7; e++) pluck(beat(24 + e * 0.5), midi(67 + e * 2), 0.32, e % 2 ? 0.4 : -0.4);
for (let e = 0; e < 7; e++) bass(beat(24 + e * 0.5), beat(0.45), midi(roots[6]), 0.5);
riser(beat(24), beat(3.5), 0.5);
reverseCymbal(beat(28), beat(1.5), 0.45);

// Bar 7: the logo lands.
kick(beat(28), 1);
impact(beat(28), 1);
pad(beat(28), DURATION - beat(28), chords[7], 0.6, 2400);
bass(beat(28), DURATION - beat(28) - 0.05, midi(roots[7]), 0.6);
[81, 84, 88, 91, 93, 96].forEach((m, i) => pluck(beat(28 + i * 0.25), midi(m), 0.3, -0.5 + i * 0.2));
chime(beat(29), midi(76), 0.3, 0);
for (let s = 0; s < 8; s++) tick(beat(30 + s * 0.125), 0.12, 3000, (s % 2 ? 0.3 : -0.3));
kick(beat(30), 0.5);
chime(beat(31), midi(93), 0.28, 0.1);

// --- mix -------------------------------------------------------------------

function sidechain(t) {
  let last = -1;
  for (const k of kickTimes) if (k <= t) last = k; else break;
  if (last < 0) return 1;
  const dt = t - last;
  return 1 - 0.65 * Math.min(1, dt / 0.004) * Math.exp(-dt / 0.13);
}
kickTimes.sort((a, b) => a - b);

function reverb(input, offset) {
  const out = new Float64Array(N);
  const combs = [29.7, 37.1, 41.1, 43.7].map((ms) => ({ buf: new Float64Array(Math.round(((ms + offset) * SR) / 1000)), i: 0, lp: 0 }));
  const aps = [5.0, 1.7].map((ms) => ({ buf: new Float64Array(Math.round(((ms + offset * 0.3) * SR) / 1000)), i: 0 }));
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.6 + c.lp * 0.4;
      c.buf[c.i] = input[n] + c.lp * 0.8;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    s *= 0.25;
    for (const a of aps) {
      const d = a.buf[a.i];
      const y = -0.7 * s + d;
      a.buf[a.i] = s + 0.7 * y;
      a.i = (a.i + 1) % a.buf.length;
      s = y;
    }
    out[n] = s;
  }
  return out;
}

const wet = [reverb(verb[0], 0), reverb(verb[1], 1.3)];
const mix = [new Float64Array(N), new Float64Array(N)];
for (let c = 0; c < 2; c++) {
  const hp = new Biquad("hp", 28, 0.7);
  for (let n = 0; n < N; n++) {
    const t = n / SR;
    const tail = Math.min(1, (DURATION - t) / 0.25);
    mix[c][n] = hp.run(main[c][n] + pump[c][n] * sidechain(t) + wet[c][n] * 0.6) * tail;
  }
}

function limit(channels, gain) {
  const la = Math.round(0.002 * SR);
  const rel = 1 - Math.exp(-1 / (0.08 * SR));
  const req = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const peak = Math.max(Math.abs(channels[0][n]), Math.abs(channels[1][n])) * gain;
    req[n] = peak > CEILING ? CEILING / peak : 1;
  }
  const out = [new Float64Array(N), new Float64Array(N)];
  let g = 1;
  for (let n = 0; n < N; n++) {
    let target = 1;
    for (let k = n; k < Math.min(N, n + la); k++) target = Math.min(target, req[k]);
    g = target < g ? target : g + (target - g) * rel;
    for (let c = 0; c < 2; c++) out[c][n] = Math.max(-CEILING, Math.min(CEILING, channels[c][n] * gain * g));
  }
  return out;
}

// Iterate gain until the limited master sits on target loudness.
let gain = 10 ** ((TARGET_LUFS - integratedLufs(mix)) / 20);
let mastered = limit(mix, gain);
let lufs = integratedLufs(mastered);
for (let pass = 0; pass < 6 && Math.abs(lufs - TARGET_LUFS) > 0.05; pass++) {
  gain *= 10 ** ((TARGET_LUFS - lufs) / 20);
  mastered = limit(mix, gain);
  lufs = integratedLufs(mastered);
}

fs.mkdirSync("public", { recursive: true });
writeWav("public/reel.wav", mastered, fs);
const peak = Math.max(...mastered.map((ch) => ch.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
console.log(`public/reel.wav  ${DURATION}s  ${lufs.toFixed(2)} LUFS  peak ${(20 * Math.log10(peak)).toFixed(2)} dBFS  gain ${(20 * Math.log10(gain)).toFixed(1)} dB`);
