import { EffectLayer, type MediaInput } from "../media";
import { hexToOklab, packColors } from "../color";
import { COLOR, COVER, GRAIN, HASH, frag } from "../glsl";
import type { Uniforms } from "../gl";

// Gradient map + film grain over footage: luminance picks a colour from stops
// mixed in OKLab — duotones, tritones, brand tints (docs/EFFECTS.md §5.3).

export type GradientMapProps = {
  source: MediaInput;
  /** Colours for shadows → highlights, 2–6. */
  colors: string[];
  /** 0 = original footage, 1 = fully mapped. */
  amount?: number;
  contrast?: number;
  /** Grain amount, 0–0.3, and size in pixels. */
  grain?: number;
  grainSize?: number;
  time?: number;
  style?: React.CSSProperties;
};

export const GRADIENT_MAP_FRAGMENT = frag(
  HASH,
  COLOR,
  GRAIN,
  COVER,
  `
uniform sampler2D uSource;
uniform vec2 uSourceSize;
uniform float uHasSource, uCount, uAmount, uContrast, uGrain, uGrainSize;
uniform vec3 uColors[6];

void main() {
  vec3 src = texture(uSource, coverUv(vUv, uResolution, uSourceSize)).rgb;
  float l = clamp((luma(src) - 0.5) * uContrast + 0.5, 0.0, 1.0);
  float x = l * (uCount - 1.0);
  int a = int(floor(x));
  int b = min(a + 1, int(uCount) - 1);
  float f = fract(x);
  vec3 mapped = linearToSrgb(oklabToLinear(mix(uColors[a], uColors[b], f * f * (3.0 - 2.0 * f))));
  vec3 col = mix(src, mapped, uAmount);
  col += grain(vUv * uResolution, uGrainSize) * uGrain;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
);

export function gradientMapUniforms(p: GradientMapProps): Uniforms {
  const colors = packColors(p.colors, hexToOklab, 6);
  return {
    uColors: { v3: colors.v3 },
    uCount: Math.max(2, colors.count),
    uAmount: p.amount ?? 1,
    uContrast: p.contrast ?? 1,
    uGrain: p.grain ?? 0.06,
    uGrainSize: p.grainSize ?? 1.2,
  };
}

export const GradientMap: React.FC<GradientMapProps> = (props) => (
  <EffectLayer fragment={GRADIENT_MAP_FRAGMENT} uniforms={gradientMapUniforms(props)} source={props.source} time={props.time} style={props.style} />
);
