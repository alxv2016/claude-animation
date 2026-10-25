// Scripted ripples: the video replacement for pointer clicks. Each ripple is an
// expanding ring that starts at a time, usually a beat (.agents/skills/apply-effect/references/catalog.md#ripples-and-beat-sync).

export type Ripple = {
  /** 0–1 across the canvas, left → right. */
  x: number;
  /** 0–1 down the canvas, top → bottom. */
  y: number;
  /** Start time in seconds. */
  at: number;
  /** Ring strength, default 1. */
  strength?: number;
};

export const MAX_RIPPLES = 8;

/** The 8 most recent ripples that have started by `time`, as a vec4 array (x, y, at, strength). */
export function rippleUniforms(ripples: Ripple[] = [], time: number) {
  const started = ripples.filter((r) => r.at <= time).sort((a, b) => b.at - a.at).slice(0, MAX_RIPPLES);
  const v4: number[] = [];
  for (let i = 0; i < MAX_RIPPLES; i++) {
    const r = started[i];
    v4.push(r ? r.x : 0, r ? 1 - r.y : 0, r ? r.at : -1e3, r ? (r.strength ?? 1) : 0);
  }
  return { uRipples: { v4 }, uRippleCount: started.length };
}

export const RIPPLE_GLSL = `
uniform vec4 uRipples[8];
uniform float uRippleCount, uRippleSpeed, uRippleWidth, uRippleDecay;
// Sum of expanding Gaussian rings at canvas uv; aspect-correct distance.
float ripples(vec2 uv, float aspect) {
  float v = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uRippleCount) break;
    vec4 r = uRipples[i];
    float age = uTime - r.z;
    if (age < 0.0) continue;
    float d = length((uv - r.xy) * vec2(aspect, 1.0));
    float ring = (d - age * uRippleSpeed) / uRippleWidth;
    v += r.w * exp(-ring * ring) * exp(-age * uRippleDecay);
  }
  return v;
}
`;
