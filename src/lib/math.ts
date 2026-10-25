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

/**
 * Closed-form step response 0→1 of a mass-spring-damper released at rest, at natural
 * frequency `w0` (rad/s) and damping ratio `zeta`: under-, critically and over-damped.
 */
function springStep(dt: number, w0: number, zeta: number) {
  if (dt <= 0) return 0;
  if (zeta < 1 - 1e-6) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * dt) * (Math.cos(wd * dt) + ((zeta * w0) / wd) * Math.sin(wd * dt));
  }
  if (zeta <= 1 + 1e-6) return 1 - Math.exp(-w0 * dt) * (1 + w0 * dt);
  const s = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - s);
  const r2 = -w0 * (zeta + s);
  return 1 + (r2 * Math.exp(r1 * dt) - r1 * Math.exp(r2 * dt)) / (r1 - r2);
}

/** Spring by frequency (Hz) and damping ratio (< 1 overshoots, 1 critical, > 1 sluggish), 0→1. `dt` in seconds. */
export const spring = (dt: number, freq = 2.2, damping = 0.45) => springStep(dt, 2 * Math.PI * freq, damping);

/**
 * Spring by stiffness and damping, mass 1 by default (react-spring's tension / friction units:
 * 170 / 26 is its default, near-critical). 0→1, `dt` in seconds.
 */
export const springKD = (dt: number, stiffness = 170, damping = 26, mass = 1) =>
  springStep(dt, Math.sqrt(stiffness / mass), damping / (2 * Math.sqrt(stiffness * mass)));

/**
 * Springs by role, `[stiffness, damping]` for `springKD(dt, ...SPRINGS.heavy)` and `track`
 * (make-motion-film skill, techniques.md "Springs by role"). Overshoot and 2 % settle measured.
 */
export const SPRINGS = {
  /** Buttons, toggles, leading edges: 0.8 %, 0.23 s. */
  snappy: [320, 30],
  /** Cards, containers, camera: none, 0.44 s. */
  default: [170, 26],
  /** Big type, devices, 3D objects, logo lockups: slow, 1.1 %, 0.36 s from a lower stiffness. */
  heavy: [120, 18],
  /** Mascots, stickers: visible, 12 %. Never on UI or text being read. */
  playful: [260, 18],
} as const;

/** Keyframes `[time, value]` (sorted, seconds) as a sum of one spring per change: continuous through retargets. */
export function track(t: number, keys: readonly (readonly [number, number])[], stiffness = 170, damping = 26) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * springKD(t - keys[i][0], stiffness, damping);
  return v;
}

/**
 * A stretching indicator (tab underline, selection lens): both edges follow the same stops,
 * the leading edge on a stiffer spring than the trailing one, so it stretches as it travels.
 */
export function indicator(
  t: number,
  stops: readonly (readonly [number, number])[],
  width: number,
  lead: readonly [number, number] = [320, 30],
  trail: readonly [number, number] = [140, 22],
) {
  const a = track(t, stops, lead[0], lead[1]);
  const b = track(t, stops, trail[0], trail[1]);
  return { left: Math.min(a, b), right: Math.max(a, b) + width };
}

/**
 * Opacity of text inside a morphing container: in after the morph starts (`tIn` + delay),
 * out before the next one (`tOut`), so text never rides a moving edge.
 */
export function swapAlpha(t: number, tIn: number, tOut: number, delay = 0.08, fadeIn = 0.12, fadeOut = 0.1) {
  return Math.min(clamp((t - tIn - delay) / fadeIn), clamp((tOut - fadeOut - t) / fadeOut));
}

/** Wraps time into [0, dur) for seamless loops; the film must also end where it started (.agents/skills/make-motion-film/types/ui-motion.md). */
export const loopT = (t: number, dur: number) => ((t % dur) + dur) % dur;

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
