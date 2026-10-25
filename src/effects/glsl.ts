// Shared GLSL. Every effect's fragment shader is HEADER + the libraries it needs + its main().
// All randomness is integer-hashed from coordinates and the frame index: deterministic per render.

export const HEADER = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;   // canvas size in pixels
uniform float uTime;        // seconds, from the frame number
uniform float uFrame;       // integer frame index, for per-frame grain
`;

export const HASH = `
uint pcgHash(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float hash1(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p)) + 65536);
  return float(pcgHash(q.x + pcgHash(q.y))) / 4294967295.0;
}
float hash1(vec3 p) {
  uvec3 q = uvec3(ivec3(floor(p)) + 65536);
  return float(pcgHash(q.x + pcgHash(q.y + pcgHash(q.z)))) / 4294967295.0;
}
vec2 hash2(vec2 p) { return vec2(hash1(p), hash1(p + 17.31)); }
`;

// Gradient noise on a 3D lattice (x, y, time), quintic fade; returns -1..1.
export const NOISE = `
vec3 gradAt(vec3 c) {
  float a = hash1(c) * 6.2831853;
  float z = hash1(c + 31.7) * 2.0 - 1.0;
  float r = sqrt(1.0 - z * z);
  return vec3(r * cos(a), r * sin(a), z);
}
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n000 = dot(gradAt(i), f);
  float n100 = dot(gradAt(i + vec3(1, 0, 0)), f - vec3(1, 0, 0));
  float n010 = dot(gradAt(i + vec3(0, 1, 0)), f - vec3(0, 1, 0));
  float n110 = dot(gradAt(i + vec3(1, 1, 0)), f - vec3(1, 1, 0));
  float n001 = dot(gradAt(i + vec3(0, 0, 1)), f - vec3(0, 0, 1));
  float n101 = dot(gradAt(i + vec3(1, 0, 1)), f - vec3(1, 0, 1));
  float n011 = dot(gradAt(i + vec3(0, 1, 1)), f - vec3(0, 1, 1));
  float n111 = dot(gradAt(i + vec3(1, 1, 1)), f - vec3(1, 1, 1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y), mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z) * 1.6;
}
float fbm3(vec3 p, int octaves) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    v += a * noise3(p);
    p = p * 2.03 + vec3(11.3, 7.1, 3.7);
    a *= 0.5;
  }
  return v;
}
`;

export const COLOR = `
vec3 linearToSrgb(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 oklabToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
float luma(vec3 srgb) { return dot(srgb, vec3(0.2126, 0.7152, 0.0722)); }
`;

// Ordered-dither thresholds from the recursive Bayer definition: each bit of (x, y),
// lowest first, contributes the next base-4 digit via the 2x2 pattern (0 2 / 3 1).
// order 1, 2, 3 → 2x2, 4x4, 8x8 matrices.
export const BAYER = `
float bayer(vec2 cell, int order) {
  uvec2 p = uvec2(ivec2(floor(cell)) & 255);
  uint v = 0u;
  for (int b = 0; b < 4; b++) {
    if (b >= order) break;
    uint x = (p.x >> uint(b)) & 1u;
    uint y = (p.y >> uint(b)) & 1u;
    v = v * 4u + 2u * (x ^ y) + y;
  }
  float n = float(1 << (2 * order));
  return (float(v) + 0.5) / n;
}
// Interleaved gradient noise: a fast, even threshold field (Jimenez 2014).
float ign(vec2 p) { return fract(52.9829189 * fract(dot(floor(p), vec2(0.06711056, 0.00583715)))); }
`;

export const GRAIN = `
// Luminance-neutral grain, new pattern every frame. size in pixels.
float grain(vec2 fragCoord, float size) {
  vec2 c = floor(fragCoord / max(size, 1.0));
  float a = hash1(vec3(c, uFrame));
  float b = hash1(vec3(c + 91.7, uFrame));
  return (a + b) - 1.0; // triangular distribution, -1..1
}
`;

export const SDF = `
float sdRoundRect(vec2 p, vec2 halfSize, float r) {
  r = min(r, min(halfSize.x, halfSize.y));
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
// Polynomial smooth minimum: shapes closer than k melt together.
float smin(float a, float b, float k) {
  if (k <= 0.0) return min(a, b);
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
`;

/** Samples a texture with "cover" fit: fills the canvas, cropping the source's longer side. */
export const COVER = `
vec2 coverUv(vec2 uv, vec2 canvas, vec2 source) {
  float ca = canvas.x / canvas.y, sa = source.x / source.y;
  vec2 scale = ca > sa ? vec2(1.0, sa / ca) : vec2(ca / sa, 1.0);
  return (uv - 0.5) * scale + 0.5;
}
`;

export const frag = (...parts: string[]) => [HEADER, ...parts].join("\n");
