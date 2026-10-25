import { ShaderCanvas } from "../ShaderCanvas";
import { hexToOklab, packColors } from "../color";
import { COLOR, GRAIN, HASH, NOISE, frag } from "../glsl";
import type { Uniforms } from "../gl";

// Grainy animated gradient — the primary background (.agents/skills/apply-effect/references/catalog.md#gradient).
// Colours blend in OKLab; a two-level domain warp makes them flow; silk adds soft
// banded sheen; per-frame grain keeps flat areas from banding in H.264.

export type GradientProps = {
  /** 2–6 colour stops, hex. */
  colors: string[];
  /** mesh: colour points drifting and blending; linear / radial / conic: stops along an axis. */
  type?: "mesh" | "linear" | "radial" | "conic";
  /** Degrees, for linear and conic. 0 = left → right. */
  angle?: number;
  /** 0–1 canvas position, for radial and conic. */
  center?: [number, number];
  /** Flow speed multiplier. */
  speed?: number;
  /** Noise feature size; higher = smaller features. */
  scale?: number;
  /** Domain-warp strength, 0 = straight gradient. */
  warp?: number;
  /** Number of silk bands across the canvas; 0 disables. */
  bands?: number;
  /** Silk sheen strength, 0–1. */
  silk?: number;
  /** 0 = hard colour regions, 1 = smooth blends. */
  softness?: number;
  /** Grain amount, 0–0.3. */
  grain?: number;
  /** Grain size in pixels. */
  grainSize?: number;
  contrast?: number;
  saturation?: number;
  /** Changes the noise field and mesh paths. */
  seed?: number;
};

const TYPES = { mesh: 0, linear: 1, radial: 2, conic: 3 };

export const GRADIENT_FRAGMENT = frag(
  HASH,
  NOISE,
  COLOR,
  GRAIN,
  `
uniform vec3 uColors[6];
uniform float uCount, uType, uAngle, uSpeed, uScale, uWarp, uBands, uSilk, uSoftness;
uniform float uGrain, uGrainSize, uContrast, uSaturation, uSeed;
uniform vec2 uCenter;

vec3 ramp(float x) {
  x = clamp(x, 0.0, 1.0) * (uCount - 1.0);
  int a = int(floor(x));
  int b = min(a + 1, int(uCount) - 1);
  float f = fract(x);
  float hard = smoothstep(0.5 - 0.02, 0.5 + 0.02, f);
  float soft = f * f * (3.0 - 2.0 * f);
  return mix(uColors[a], uColors[b], mix(hard, soft, uSoftness));
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * uSpeed;
  vec3 seed = vec3(uSeed * 17.0, uSeed * 31.0, uSeed * 7.0);

  // Two-level domain warp: noise displaces the coordinates that feed the next noise.
  vec2 q = p * uScale;
  vec2 w1 = vec2(fbm3(vec3(q, t * 0.12) + seed, 4), fbm3(vec3(q + 5.2, t * 0.12) + seed, 4));
  vec2 w2 = vec2(fbm3(vec3(q + 1.8 * w1 + 1.7, t * 0.18) + seed, 3), fbm3(vec3(q + 1.8 * w1 + 9.2, t * 0.18) + seed, 3));
  vec2 pw = p + uWarp * 0.4 * w2;
  vec2 dir = vec2(cos(radians(uAngle)), sin(radians(uAngle)));

  vec3 lab;
  if (uType < 0.5) {
    // Mesh: colour points on slow Lissajous paths, inverse-distance blended.
    vec3 acc = vec3(0.0);
    float wsum = 0.0;
    float power = 1.0 + 2.0 * (1.0 - uSoftness);
    for (int i = 0; i < 6; i++) {
      if (float(i) >= uCount) break;
      float fi = float(i);
      vec2 c = vec2(0.42 * aspect, 0.4) * vec2(
        sin(t * 0.23 * (1.0 + 0.17 * fi) + fi * 2.1 + uSeed),
        cos(t * 0.19 * (1.0 + 0.13 * fi) + fi * 1.37 + uSeed * 1.7));
      float d2 = dot(pw - c, pw - c);
      float w = 1.0 / pow(d2 + 0.015, power);
      acc += uColors[i] * w;
      wsum += w;
    }
    lab = acc / wsum;
  } else {
    float x;
    vec2 c = (uCenter - 0.5) * vec2(aspect, 1.0);
    if (uType < 1.5) x = dot(pw, dir) / (abs(dir.x) * aspect + abs(dir.y)) + 0.5;
    else if (uType < 2.5) x = length(pw - c) / (0.5 * length(vec2(aspect, 1.0)));
    else x = fract(atan(pw.y - c.y, pw.x - c.x) / 6.2831853 - uAngle / 360.0 + 1.0);
    lab = ramp(x);
  }

  // Silk: soft bands of sheen that follow the warped field.
  if (uBands > 0.0) {
    float band = sin((dot(pw, dir) * uBands + w2.x * 1.5) * 3.14159265 + t * 0.6);
    lab.x += uSilk * 0.07 * band;
    lab.yz *= 1.0 + uSilk * 0.12 * band;
  }

  lab.x = (lab.x - 0.55) * uContrast + 0.55;
  lab.yz *= uSaturation;
  vec3 srgb = linearToSrgb(oklabToLinear(lab));
  srgb += grain(vUv * uResolution, uGrainSize) * uGrain;
  outColor = vec4(clamp(srgb, 0.0, 1.0), 1.0);
}
`,
);

export function gradientUniforms(props: GradientProps): Uniforms {
  const colors = packColors(props.colors, hexToOklab, 6);
  return {
    uColors: { v3: colors.v3 },
    uCount: Math.max(2, colors.count),
    uType: TYPES[props.type ?? "mesh"],
    uAngle: props.angle ?? 0,
    uCenter: props.center ?? [0.5, 0.5],
    uSpeed: props.speed ?? 1,
    uScale: props.scale ?? 1.2,
    uWarp: props.warp ?? 1,
    uBands: props.bands ?? 0,
    uSilk: props.silk ?? 0.5,
    uSoftness: props.softness ?? 1,
    uGrain: props.grain ?? 0.06,
    uGrainSize: props.grainSize ?? 1.2,
    uContrast: props.contrast ?? 1,
    uSaturation: props.saturation ?? 1,
    uSeed: props.seed ?? 0,
  };
}

export const Gradient: React.FC<GradientProps & { time?: number; resolution?: number; style?: React.CSSProperties }> = ({ time, resolution, style, ...props }) => (
  <ShaderCanvas fragment={GRADIENT_FRAGMENT} uniforms={gradientUniforms(props)} time={time} scale={resolution} style={style} />
);
