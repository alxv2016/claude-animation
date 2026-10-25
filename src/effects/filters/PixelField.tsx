import { useCurrentFrame, useVideoConfig } from "remotion";
import { EffectLayer, type MediaInput } from "../media";
import { hexToLinear } from "../color";
import { BAYER, COLOR, COVER, HASH, NOISE, frag } from "../glsl";
import { RIPPLE_GLSL, rippleUniforms, type Ripple } from "../ripples";
import type { Uniforms } from "../gl";

// A grid of shaped pixels whose size follows a value field: animated noise in
// background mode, the footage's luminance in filter mode (docs/EFFECTS.md §4.3, §5.2).

export type PixelFieldProps = {
  /** Filter mode: mosaic this video or image. Background mode (noise field) without it. */
  source?: MediaInput;
  shape?: "square" | "circle" | "diamond" | "triangle" | "cross" | "ring";
  /** Cell pitch in pixels. */
  cellSize?: number;
  /** Pixel colour; in filter mode with `sourceColor`, pixels take the footage colour instead. */
  color?: string;
  sourceColor?: boolean;
  /** Fill behind the pixels; omit for a transparent background. */
  background?: string;
  /** Background mode: noise scale, coverage and drift. */
  scale?: number;
  density?: number;
  speed?: number;
  driftAngle?: number;
  /** 0 = pixel size follows the value; 1 = pixels switch fully on/off by ordered dither. */
  dither?: number;
  /** Random per-pixel size variation, 0–1. */
  jitter?: number;
  /** Per-pixel shimmer, 0–1. */
  twinkle?: number;
  /** Fade pixels out toward the edges, 0 = off. */
  edgeFade?: number;
  ripples?: Ripple[];
  rippleSpeed?: number;
  rippleWidth?: number;
  time?: number;
  style?: React.CSSProperties;
};

const SHAPES = { square: 0, circle: 1, diamond: 2, triangle: 3, cross: 4, ring: 5 };

export const PIXEL_FRAGMENT = frag(
  HASH,
  NOISE,
  COLOR,
  BAYER,
  COVER,
  `
uniform sampler2D uSource;
uniform vec2 uSourceSize;
uniform float uHasSource, uShape, uCell, uSourceColor, uBgAlpha, uScale, uDensity, uSpeed, uDrift;
uniform float uDither, uJitter, uTwinkle, uEdgeFade;
uniform vec3 uColor, uBg;
${RIPPLE_GLSL}

float box(vec2 q, vec2 b) { vec2 d = abs(q) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }

// Signed distance of the cell's shape at coverage s (0–1), q in -0.5..0.5.
float shapeDist(vec2 q, float s) {
  if (uShape < 0.5) return box(q, vec2(s * 0.5));
  if (uShape < 1.5) return length(q) - s * 0.56;
  if (uShape < 2.5) return (abs(q.x) + abs(q.y)) - s * 0.75;
  if (uShape < 3.5) {
    q.y += s * 0.12;
    vec2 k = vec2(0.8660254, 0.5);
    q.x = abs(q.x);
    return max(dot(q, k), -q.y) - s * 0.3;
  }
  if (uShape < 4.5) return min(box(q, vec2(s * 0.5, s * 0.17)), box(q, vec2(s * 0.17, s * 0.5)));
  return abs(length(q) - s * 0.36) - s * 0.12;
}

void main() {
  vec2 frag = vUv * uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 cell = floor(frag / uCell);
  vec2 q = fract(frag / uCell) - 0.5;
  vec2 uv = (cell + 0.5) * uCell / uResolution;

  vec3 src = vec3(0.0);
  float v;
  if (uHasSource > 0.5) {
    src = texture(uSource, coverUv(uv, uResolution, uSourceSize)).rgb;
    v = luma(src);
  } else {
    float a = radians(uDrift);
    vec2 drift = vec2(cos(a), sin(a)) * uTime * uSpeed * 0.15;
    float n = fbm3(vec3(uv * vec2(aspect, 1.0) * uScale + drift, uTime * uSpeed * 0.12), 4);
    v = clamp(n * 1.3 + 0.5 * uDensity, 0.0, 1.0);
  }
  v += ripples(uv, aspect);
  v *= 1.0 - uTwinkle * 0.5 * (0.5 + 0.5 * sin(uTime * 4.0 + hash1(cell) * 6.2831853));
  v *= 1.0 - uJitter * hash1(cell + 7.3);
  if (uEdgeFade > 0.0) {
    vec2 e = min(uv, 1.0 - uv);
    v *= smoothstep(0.0, uEdgeFade, min(e.x * aspect, e.y) * 2.0);
  }
  float size = mix(clamp(v, 0.0, 1.0), step(bayer(cell, 3), v), uDither);

  float aa = 1.2 / uCell;
  float m = size > 0.001 ? 1.0 - smoothstep(-aa, aa, shapeDist(q, size)) : 0.0;
  vec3 ink = uSourceColor > 0.5 && uHasSource > 0.5 ? src : linearToSrgb(uColor);
  vec3 bg = linearToSrgb(uBg);
  float alpha = m + uBgAlpha * (1.0 - m);
  vec3 rgb = ink * m + bg * uBgAlpha * (1.0 - m);
  outColor = vec4(rgb, alpha); // premultiplied
}
`,
);

export function pixelUniforms(p: PixelFieldProps, time: number): Uniforms {
  return {
    uShape: SHAPES[p.shape ?? "square"],
    uCell: Math.max(2, p.cellSize ?? 14),
    uColor: hexToLinear(p.color ?? "#d97757"),
    uSourceColor: p.sourceColor ? 1 : 0,
    uBg: hexToLinear(p.background ?? "#000000"),
    uBgAlpha: p.background ? 1 : 0,
    uScale: p.scale ?? 2.2,
    uDensity: p.density ?? 0.6,
    uSpeed: p.speed ?? 1,
    uDrift: p.driftAngle ?? 30,
    uDither: p.dither ?? 0,
    uJitter: p.jitter ?? 0,
    uTwinkle: p.twinkle ?? 0.2,
    uEdgeFade: p.edgeFade ?? 0,
    uRippleSpeed: p.rippleSpeed ?? 0.8,
    uRippleWidth: p.rippleWidth ?? 0.06,
    uRippleDecay: 1.4,
    ...rippleUniforms(p.ripples, time),
  };
}

export const PixelField: React.FC<PixelFieldProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = props.time ?? frame / fps;
  return <EffectLayer fragment={PIXEL_FRAGMENT} uniforms={pixelUniforms(props, time)} source={props.source} time={props.time} style={props.style} />;
};
