import { useCurrentFrame, useVideoConfig } from "remotion";
import { EffectLayer, type MediaInput } from "../media";
import { packColors, hexToLinear } from "../color";
import { BAYER, COLOR, COVER, HASH, NOISE, frag } from "../glsl";
import { RIPPLE_GLSL, rippleUniforms, type Ripple } from "../ripples";
import type { Uniforms } from "../gl";

// Ordered dithering, as a background (animated noise waves) or a filter over
// video and images (docs/EFFECTS.md §4.4, §5.1). The image is snapped to a cell
// grid, toned, then quantised to a palette with a per-cell threshold pattern.

export type DitherProps = {
  /** Filter mode: dither this video or image. Background mode (noise waves) without it. */
  source?: MediaInput;
  mode?: "bayer8" | "bayer4" | "bayer2" | "halftone" | "lines" | "crosshatch" | "noise" | "none";
  /** Dither cell size in pixels at composition resolution. */
  pixelSize?: number;
  /** Colours from dark to light; the image maps onto them by luminance. Omit to keep source colours. */
  palette?: string[];
  /** Levels per channel when there is no palette. */
  levels?: number;
  contrast?: number;
  brightness?: number;
  /** >1 darkens mid-tones, <1 lightens them. */
  gamma?: number;
  /** Screen angle in degrees for halftone, lines and crosshatch. */
  angle?: number;
  /** Background mode: wave speed, frequency and warp. */
  waveSpeed?: number;
  waveFrequency?: number;
  waveWarp?: number;
  /** Rings that brighten as they pass, e.g. on beats. */
  ripples?: Ripple[];
  rippleSpeed?: number;
  rippleWidth?: number;
  time?: number;
  style?: React.CSSProperties;
};

const MODES = { bayer8: 0, bayer4: 1, bayer2: 2, halftone: 3, lines: 4, crosshatch: 5, noise: 6, none: 7 };

export const DITHER_FRAGMENT = frag(
  HASH,
  NOISE,
  COLOR,
  BAYER,
  COVER,
  `
uniform sampler2D uSource;
uniform vec2 uSourceSize;
uniform float uHasSource, uMode, uCell, uLevels, uPaletteCount, uContrast, uBrightness, uGamma, uAngle;
uniform float uWaveSpeed, uWaveFreq, uWaveWarp;
uniform vec3 uPalette[8];
${RIPPLE_GLSL}

vec3 sourceAt(vec2 uv, float aspect) {
  if (uHasSource > 0.5) return texture(uSource, coverUv(uv, uResolution, uSourceSize)).rgb;
  vec2 p = uv * vec2(aspect, 1.0) * uWaveFreq;
  float t = uTime * uWaveSpeed;
  vec2 w = vec2(fbm3(vec3(p, t), 3), fbm3(vec3(p + 4.7, t), 3));
  float v = fbm3(vec3(p + uWaveWarp * w, t * 0.7), 5);
  return vec3(v * 0.6 + 0.5);
}

void main() {
  vec2 frag = vUv * uResolution;
  float aspect = uResolution.x / uResolution.y;
  float c = radians(uAngle);
  mat2 rot = mat2(cos(c), -sin(c), sin(c), cos(c));
  bool screen = uMode > 2.5 && uMode < 5.5;

  // Snap to the dither grid (screens snap in rotated space).
  vec2 grid = screen ? rot * frag / uCell : frag / uCell;
  vec2 cell = floor(grid);
  vec2 cellCentre = screen ? (transpose(rot) * ((cell + 0.5) * uCell)) : (cell + 0.5) * uCell;
  vec2 uv = clamp(cellCentre / uResolution, 0.0, 1.0);

  vec3 src = sourceAt(uv, aspect);
  src += ripples(uv, aspect) * 0.5;
  src = clamp((src - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
  src = pow(src, vec3(uGamma));

  vec2 f = fract(grid) - 0.5;
  float threshold;
  if (uMode < 0.5) threshold = bayer(cell, 3);
  else if (uMode < 1.5) threshold = bayer(cell, 2);
  else if (uMode < 2.5) threshold = bayer(cell, 1);
  else if (uMode < 3.5) threshold = clamp(length(f) * 1.414, 0.0, 1.0);
  else if (uMode < 4.5) threshold = abs(f.y) * 2.0;
  else if (uMode < 5.5) {
    vec2 g2 = fract(transpose(rot) * frag / uCell) - 0.5;
    threshold = min(abs(f.y) * 2.0, mix(1.0, abs(g2.y) * 2.0, step(0.5, 1.0 - luma(src))));
  }
  else if (uMode < 6.5) threshold = ign(cell);
  else threshold = 0.5;

  vec3 col;
  if (uPaletteCount > 0.5) {
    float steps = uPaletteCount - 1.0;
    float idx = clamp(floor(luma(src) * steps + threshold), 0.0, steps);
    col = linearToSrgb(uPalette[int(idx)]);
  } else {
    float steps = max(uLevels - 1.0, 1.0);
    col = floor(src * steps + threshold) / steps;
  }
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
);

export function ditherUniforms(p: DitherProps, time: number): Uniforms {
  const palette = p.palette?.length ? packColors(p.palette, hexToLinear, 8) : null;
  return {
    uMode: MODES[p.mode ?? "bayer8"],
    uCell: Math.max(1, p.pixelSize ?? 4),
    uLevels: p.levels ?? 2,
    uPalette: { v3: palette?.v3 ?? new Array(24).fill(0) },
    uPaletteCount: palette?.count ?? 0,
    uContrast: p.contrast ?? 1,
    uBrightness: p.brightness ?? 0,
    uGamma: p.gamma ?? 1,
    uAngle: p.angle ?? 45,
    uWaveSpeed: p.waveSpeed ?? 0.25,
    uWaveFreq: p.waveFrequency ?? 1.6,
    uWaveWarp: p.waveWarp ?? 1.2,
    uRippleSpeed: p.rippleSpeed ?? 0.9,
    uRippleWidth: p.rippleWidth ?? 0.08,
    uRippleDecay: 1.6,
    ...rippleUniforms(p.ripples, time),
  };
}

export const Dither: React.FC<DitherProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = props.time ?? frame / fps;
  return <EffectLayer fragment={DITHER_FRAGMENT} uniforms={ditherUniforms(props, time)} source={props.source} time={props.time} style={props.style} />;
};
