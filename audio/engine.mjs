// The score engine: instruments, mix and mastering for scores written in code (studio rule R13).
// A film's score module calls these through createSession(); `npx motion-kit score` renders it,
// masters it to −14 LUFS and measures its beat grid (score-and-beats skill).
import { SR, Biquad, mulberry32, integratedLufs } from "./dsp.mjs";
import { pianoVoice } from "./piano.mjs";

export function createSession({ bpm = 120, duration, seed = 1337, target = -14, ceilingDb = -1.5, tailFade = 0.25 }) {
  const BPM = bpm;
  const BEAT = 60 / BPM;
  const DURATION = duration;
  const N = Math.round(DURATION * SR);
  const TARGET_LUFS = target;
  const CEILING = 10 ** (ceilingDb / 20);

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


  /** Acoustic piano note (see piano.mjs): midi note, velocity 0–1, held for `len` seconds. */
  function piano(t0, note, velocity = 0.7, len = 1, pan) {
    pianoVoice({ t0, note, velocity, len, pan, rand, write: (i, l, r) => write(main, i, l, r), send: (i, l, r) => write(verb, i, l, r) });
  }

  // --- mix and master ---------------------------------------------------------

  function master() {
    kickTimes.sort((a, b) => a - b);
    // --- mix -------------------------------------------------------------------

    function sidechain(t) {
      let last = -1;
      for (const k of kickTimes) if (k <= t) last = k; else break;
      if (last < 0) return 1;
      const dt = t - last;
      return 1 - 0.65 * Math.min(1, dt / 0.004) * Math.exp(-dt / 0.13);
    }

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
        const tail = Math.min(1, (DURATION - t) / tailFade);
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

    const peak = Math.max(...mastered.map((ch) => ch.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
    return { channels: mastered, lufs, peakDb: 20 * Math.log10(peak), gainDb: 20 * Math.log10(gain) };
  }

  // Every cue, for syncing picture to the notes that were actually placed.
  const events = [];
  const logged = (type, fn, at = (args) => args[0]) => (...args) => {
    events.push({ type, t: +at(args).toFixed(5), args: args.slice(1).map((a) => (typeof a === "number" ? +a.toFixed(4) : a)) });
    return fn(...args);
  };
  return {
    SR, bpm: BPM, beatSeconds: BEAT, duration: DURATION,
    beat: (b) => b * BEAT,
    midi,
    noise,
    rand,
    kick: logged("kick", kick),
    clap: logged("clap", clap),
    hat: logged("hat", hat),
    pluck: logged("pluck", pluck),
    chime: logged("chime", chime),
    tick: logged("tick", tick),
    bass: logged("bass", bass),
    pad: logged("pad", pad),
    impact: logged("impact", impact),
    whoosh: logged("whoosh", whoosh),
    reverseCymbal: logged("reverseCymbal", reverseCymbal, (args) => args[0] - args[1]),
    riser: logged("riser", riser),
    piano: logged("piano", piano),
    master,
    events,
  };
}
