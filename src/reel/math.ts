export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** 0→1 progress of x through [a, b], clamped. */
export const prog = (x: number, a: number, b: number) => clamp((x - a) / (b - a));

export const easeOutExpo = (u: number) => (u >= 1 ? 1 : 1 - 2 ** (-10 * u));
export const easeInExpo = (u: number) => (u <= 0 ? 0 : 2 ** (10 * u - 10));
export const easeInCubic = (u: number) => u * u * u;
export const easeOutCubic = (u: number) => 1 - (1 - u) ** 3;
export const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
export const easeOutBack = (u: number, s = 1.70158) => 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2;
export const easeInBack = (u: number, s = 1.70158) => (s + 1) * u ** 3 - s * u * u;
export const easeOutBounce = (u: number) => {
  const n = 7.5625, d = 2.75;
  if (u < 1 / d) return n * u * u;
  if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75;
  if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375;
  return n * (u -= 2.625 / d) * u + 0.984375;
};

/** CSS `cubic-bezier(x1, y1, x2, y2)` as an easing function: solves x(t) = u, returns y(t). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const curve = (t: number, p1: number, p2: number) => 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3;
  const slope = (t: number) => 3 * (1 - t) ** 2 * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
  return (u: number) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let t = u;
    for (let i = 0; i < 8; i++) {
      const d = slope(t);
      if (Math.abs(d) < 1e-6) break;
      t = clamp(t - (curve(t, x1, x2) - u) / d);
    }
    // Newton can stall on flat segments; bisection always converges.
    if (Math.abs(curve(t, x1, x2) - u) > 1e-5) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 30; i++) {
        t = (lo + hi) / 2;
        if (curve(t, x1, x2) < u) lo = t; else hi = t;
      }
    }
    return curve(t, y1, y2);
  };
}

/** Closed-form damped spring step response, 0→1. `dt` in seconds. */
export function spring(dt: number, freq = 2.2, damping = 0.45) {
  if (dt <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const wd = w * Math.sqrt(1 - damping * damping);
  const decay = Math.exp(-damping * w * dt);
  return 1 - decay * (Math.cos(wd * dt) + ((damping * w) / wd) * Math.sin(wd * dt));
}

/** Decaying oscillation for hit reactions, starts at 1. `dt` in seconds. */
export const wobble = (dt: number, decay = 0.15, freq = 5) =>
  dt < 0 ? 0 : Math.exp(-dt / decay) * Math.cos(2 * Math.PI * freq * dt);

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stateless seeded random in [0, 1) for an integer key. */
export const hash = (i: number, seed = 0) => mulberry32(Math.imul(i, 374761393) + Math.imul(seed, 668265263))();

/** Smooth 1D value noise in [-1, 1]. */
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1;
}

export function mixHex(a: string, b: string, u: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(lerp(v, pb[i], clamp(u))));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
