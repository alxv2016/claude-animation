import { ShaderCanvas } from "../ShaderCanvas";
import { hexToLinear } from "../color";
import { COLOR, GRAIN, HASH, frag } from "../glsl";
import type { Uniforms } from "../gl";

// A ray-marched wave surface under a gradient sky (.agents/skills/apply-effect/references/catalog.md#gradientwaves).
// Height = four directional wave trains with sharpened crests; each pixel's ray
// marches to the surface, refines the hit, and shades by height, slope and fog.

export type GradientWavesProps = {
  /** Sky at the top of the frame. */
  skyColor?: string;
  /** Sky and fog at the horizon. */
  horizonColor?: string;
  /** Wave troughs. */
  waveColor?: string;
  /** Wave crests and highlights. */
  crestColor?: string;
  speed?: number;
  /** Wave height. */
  amplitude?: number;
  /** Wave frequency; higher = smaller waves. */
  frequency?: number;
  /** 0 = rolling sine swell, 1 = sharp peaked crests. */
  choppiness?: number;
  /** Camera height above the mean surface. */
  cameraHeight?: number;
  /** Camera pitch in degrees below the horizon. */
  tilt?: number;
  /** Fog density; higher = shorter view distance. */
  fog?: number;
  /** Sun direction in degrees around the view axis. */
  sunAngle?: number;
  /** Specular strength of the sun on the water. */
  sheen?: number;
  grain?: number;
};

export const WAVES_FRAGMENT = frag(
  HASH,
  COLOR,
  GRAIN,
  `
uniform vec3 uSky, uHorizon, uDeep, uCrest;
uniform float uSpeed, uAmp, uFreq, uChop, uCamH, uTilt, uFog, uSun, uSheen, uGrain;

const vec2 DIRS[4] = vec2[4](vec2(0.98, 0.2), vec2(-0.51, 0.86), vec2(0.75, -0.66), vec2(0.28, 0.96));

float height(vec2 x, float t) {
  float h = 0.0, a = 1.0, f = 1.0;
  for (int i = 0; i < 4; i++) {
    float phase = dot(DIRS[i], x) * f * uFreq + t * (1.0 + 0.35 * float(i)) * sqrt(f);
    float s = sin(phase) * 0.5 + 0.5;
    h += a * (pow(s, 1.0 + 2.5 * uChop) * 2.0 - 1.0);
    a *= 0.52;
    f *= 1.87;
  }
  return h * uAmp * 0.5;
}

vec3 sky(vec3 rd, vec3 sun) {
  float up = clamp(rd.y * 2.2, 0.0, 1.0);
  vec3 c = mix(uHorizon, uSky, pow(up, 0.6));
  return c + uCrest * pow(max(dot(rd, sun), 0.0), 24.0) * 0.6 * uSheen;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * uSpeed;
  float pitch = radians(uTilt);
  vec3 rd = normalize(vec3(uv.x, uv.y, 1.6));
  rd = vec3(rd.x, rd.y * cos(pitch) - rd.z * sin(pitch), rd.y * sin(pitch) + rd.z * cos(pitch));
  vec3 ro = vec3(0.0, uCamH, t * 1.6);
  vec3 sun = normalize(vec3(cos(radians(uSun)) * 0.6, 0.35, 1.0));

  vec3 col = sky(rd, sun);
  if (rd.y < 0.0) {
    // March until the ray drops below the surface, then bisect the last step.
    float d = 0.0, prev = 0.0;
    bool hit = false;
    for (int i = 0; i < 90; i++) {
      vec3 p = ro + rd * d;
      float gap = p.y - height(p.xz, t);
      if (gap < 0.0) { hit = true; break; }
      prev = d;
      d += max(gap * 0.55, 0.012 * d + 0.02);
      if (d > 60.0) break;
    }
    if (hit) {
      float lo = prev, hi = d;
      for (int i = 0; i < 6; i++) {
        float mid = 0.5 * (lo + hi);
        vec3 p = ro + rd * mid;
        if (p.y - height(p.xz, t) < 0.0) hi = mid; else lo = mid;
      }
      d = hi;
      vec3 p = ro + rd * d;
      float e = 0.02 + 0.002 * d;
      vec3 n = normalize(vec3(
        height(p.xz - vec2(e, 0.0), t) - height(p.xz + vec2(e, 0.0), t),
        2.0 * e,
        height(p.xz - vec2(0.0, e), t) - height(p.xz + vec2(0.0, e), t)));
      float crest = smoothstep(-uAmp * 0.2, uAmp * 0.55, p.y);
      vec3 water = mix(uDeep, uCrest, crest * 0.85);
      water *= 0.55 + 0.45 * max(dot(n, sun), 0.0);
      float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
      water = mix(water, sky(reflect(rd, n), sun), fresnel * 0.6);
      water += uCrest * pow(max(dot(reflect(rd, n), sun), 0.0), 60.0) * uSheen;
      float fog = 1.0 - exp(-d * uFog * 0.035);
      col = mix(water, uHorizon, fog);
    } else {
      col = uHorizon;
    }
  }
  vec3 srgb = linearToSrgb(col);
  srgb += grain(vUv * uResolution, 1.2) * uGrain;
  outColor = vec4(clamp(srgb, 0.0, 1.0), 1.0);
}
`,
);

export function wavesUniforms(p: GradientWavesProps): Uniforms {
  return {
    uSky: hexToLinear(p.skyColor ?? "#1a1440"),
    uHorizon: hexToLinear(p.horizonColor ?? "#7b5cff"),
    uDeep: hexToLinear(p.waveColor ?? "#2a1a6e"),
    uCrest: hexToLinear(p.crestColor ?? "#ffb8f0"),
    uSpeed: p.speed ?? 0.5,
    uAmp: p.amplitude ?? 1,
    uFreq: p.frequency ?? 0.45,
    uChop: p.choppiness ?? 0.4,
    uCamH: p.cameraHeight ?? 2.2,
    uTilt: p.tilt ?? 12,
    uFog: p.fog ?? 1,
    uSun: p.sunAngle ?? 20,
    uSheen: p.sheen ?? 0.8,
    uGrain: p.grain ?? 0.05,
  };
}

/** Renders at 0.75 × resolution by default: the ray march is the heaviest effect. */
export const GradientWaves: React.FC<GradientWavesProps & { time?: number; resolution?: number; style?: React.CSSProperties }> = ({ time, resolution = 0.75, style, ...props }) => (
  <ShaderCanvas fragment={WAVES_FRAGMENT} uniforms={wavesUniforms(props)} time={time} scale={resolution} style={style} />
);
