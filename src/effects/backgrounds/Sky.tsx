import { ShaderCanvas } from "../ShaderCanvas";
import { hexToLinear } from "../color";
import { COLOR, GRAIN, HASH, NOISE, frag } from "../glsl";
import type { Uniforms } from "../gl";

// Drifting clouds on a sky gradient (docs/EFFECTS.md §4.5). Domain-warped fBm gives
// the cloud density; sampling it again toward the light gives soft self-shadowing.
// Detailed enough for liquid glass to bend visibly.

export type SkyProps = {
  /** Sky at the top and bottom of the frame. */
  topColor?: string;
  bottomColor?: string;
  /** Lit and shadowed cloud colour. */
  cloudColor?: string;
  shadeColor?: string;
  /** 0 = clear sky, 1 = overcast. */
  cover?: number;
  /** 0 = wispy, 1 = hard-edged. */
  sharpness?: number;
  /** Drift speed. */
  speed?: number;
  /** Cloud size; higher = smaller clouds. */
  scale?: number;
  grain?: number;
};

export const SKY_FRAGMENT = frag(
  HASH,
  NOISE,
  COLOR,
  GRAIN,
  `
uniform vec3 uTop, uBottom, uCloud, uShade;
uniform float uCover, uSharpness, uSpeed, uScale, uGrain;

float density(vec2 q, vec2 w, float t) {
  float n = fbm3(vec3(q + 0.22 * w, t * 0.04), 6) * 0.5 + 0.5;
  float edge = mix(0.4, 0.08, uSharpness);
  return smoothstep(1.0 - uCover, 1.0 - uCover + edge, n);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  float t = uTime * uSpeed;
  vec2 q = (vUv - 0.5) * vec2(aspect, 1.0) * uScale + vec2(t * 0.06, 0.0);
  vec2 w = vec2(fbm3(vec3(q, t * 0.03), 4), fbm3(vec3(q + 3.1, t * 0.03), 4));
  float d = density(q, w, t);
  float lit = density(q + vec2(-0.05, 0.08), w, t);  // toward the light: less cloud = brighter
  float shade = clamp(0.55 + (d - lit) * 1.8 + (vUv.y - 0.5) * 0.3, 0.0, 1.0);
  vec3 sky = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
  vec3 cloud = mix(uShade, uCloud, shade);
  vec3 col = mix(sky, cloud, d);
  vec3 srgb = linearToSrgb(col) + grain(vUv * uResolution, 1.2) * uGrain;
  outColor = vec4(clamp(srgb, 0.0, 1.0), 1.0);
}
`,
);

export function skyUniforms(p: SkyProps): Uniforms {
  return {
    uTop: hexToLinear(p.topColor ?? "#0b1a44"),
    uBottom: hexToLinear(p.bottomColor ?? "#27457f"),
    uCloud: hexToLinear(p.cloudColor ?? "#e9eef7"),
    uShade: hexToLinear(p.shadeColor ?? "#2d3f66"),
    uCover: p.cover ?? 0.5,
    uSharpness: p.sharpness ?? 0.3,
    uSpeed: p.speed ?? 1,
    uScale: p.scale ?? 1.5,
    uGrain: p.grain ?? 0.03,
  };
}

export const Sky: React.FC<SkyProps & { time?: number; resolution?: number; style?: React.CSSProperties }> = ({ time, resolution, style, ...props }) => (
  <ShaderCanvas fragment={SKY_FRAGMENT} uniforms={skyUniforms(props)} time={time} scale={resolution} style={style} />
);
