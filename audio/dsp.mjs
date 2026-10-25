// Shared DSP helpers for the synthesized score: seeded noise, filters,
// WAV I/O and a BS.1770-4 loudness meter.

export const SR = 48000;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// RBJ cookbook biquad, coefficients recomputable per block for sweeps.
export class Biquad {
  constructor(type, freq, q = 0.707) {
    this.type = type;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(freq, q);
  }
  set(freq, q = this.q) {
    this.q = q;
    const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (this.type === "lp") {
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
    } else if (this.type === "hp") {
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
    } else {
      b0 = alpha; b1 = 0; b2 = -alpha;
    }
    const a0 = 1 + alpha;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0; this.a2 = (1 - alpha) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

function biquadRaw(b, a, input) {
  const out = new Float64Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = b[0] * x + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

// Integrated loudness per ITU-R BS.1770-4 (48 kHz K-weighting constants).
export function integratedLufs(channels) {
  const weighted = channels.map((ch) => {
    const s1 = biquadRaw([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], ch);
    return biquadRaw([1, -2, 1], [1, -1.99004745483398, 0.99007225036621], s1);
  });
  const block = Math.round(0.4 * SR);
  const hop = Math.round(0.1 * SR);
  const blocks = [];
  for (let start = 0; start + block <= weighted[0].length; start += hop) {
    let sum = 0;
    for (const ch of weighted) {
      let ms = 0;
      for (let i = start; i < start + block; i++) ms += ch[i] * ch[i];
      sum += ms / block;
    }
    blocks.push(sum);
  }
  const loud = (z) => -0.691 + 10 * Math.log10(z);
  const absGated = blocks.filter((z) => loud(z) > -70);
  const mean = (arr) => arr.reduce((s, z) => s + z, 0) / arr.length;
  const relGate = loud(mean(absGated)) - 10;
  return loud(mean(absGated.filter((z) => loud(z) > relGate)));
}

export function writeWav(path, channels, fs) {
  const n = channels[0].length;
  const nc = channels.length;
  const buf = Buffer.alloc(44 + n * nc * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * nc * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(nc, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * nc * 2, 28);
  buf.writeUInt16LE(nc * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * nc * 2, 40);
  const rand = mulberry32(7);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nc; c++) {
      const dither = (rand() - rand()) / 32768;
      const v = Math.max(-1, Math.min(1, channels[c][i] + dither));
      buf.writeInt16LE(Math.round(v * 32767), o);
      o += 2;
    }
  }
  fs.writeFileSync(path, buf);
}

export function readWav(path, fs) {
  const buf = fs.readFileSync(path);
  const nc = buf.readUInt16LE(22);
  let o = 12;
  while (buf.toString("ascii", o, o + 4) !== "data") o += 8 + buf.readUInt32LE(o + 4);
  const len = buf.readUInt32LE(o + 4) / (2 * nc);
  const channels = Array.from({ length: nc }, () => new Float64Array(len));
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < nc; c++) channels[c][i] = buf.readInt16LE(o + 8 + (i * nc + c) * 2) / 32768;
  }
  return channels;
}
