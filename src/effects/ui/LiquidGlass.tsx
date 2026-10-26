import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { MediaFeed, type MediaInput } from "../media";
import { GRADIENT_FRAGMENT, gradientUniforms, type GradientProps } from "../backgrounds/Gradient";
import { hexToSrgb } from "../color";
import { COLOR, COVER, SDF, frag } from "../glsl";
import { bindFullscreenTriangle, createProgram, createTarget, createTexture, setUniforms, sourceSize, uploadTexture, type Uniforms } from "../gl";

// Liquid glass UI (.agents/skills/apply-effect/references/catalog.md#liquid-glass; optics: docs/EFFECTS.md
// §7.2 in the motion-kit repo): glass panels that refract, frost and light
// the backdrop behind them, in the style of Apple's Liquid Glass. Panels closer than
// `smooth` melt into one shape, so a pill can flow from one tab to the next.
// WebGL cannot read the page, so the backdrop is drawn in the same canvas.

export type GlassPanel = {
  /** Top-left corner and size in composition pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Corner radius in pixels; ≥ half the height makes a capsule. */
  radius?: number;
};

export type GlassStyle = {
  /** Glass thickness, px: scales how far the curved rim bends the backdrop. */
  refraction: number;
  /** Width of the curved rim, px; a panel narrower than twice this is a full dome (a lens). */
  bevel: number;
  /** Index of refraction: 1 = no bending, 1.5 = glass, higher bends more. */
  ior: number;
  /** Chromatic split at the rim, 0–1. */
  dispersion: number;
  /** Frost blur radius, px; 0 = clear glass. */
  frost: number;
  /** Vibrancy: >1 boosts the colour seen through the glass. */
  saturation: number;
  brightness: number;
  tint: string;
  tintAmount: number;
  /** Rim highlight strength. */
  specular: number;
  /** Light direction in degrees: 0 from the right, 90 from the top. */
  lightAngle: number;
  /** Bright edge line width, px. */
  edgeWidth: number;
  /** Drop shadow strength, blur and downward offset (px). */
  shadow: number;
  shadowSoftness: number;
  shadowOffset: number;
  /** Panels closer than this many px melt together. */
  smooth: number;
  /**
   * Sample inward instead of outward: the glass magnifies and wraps what is under it (a lens or a glass
   * bubble over an avatar) and never shows what lies outside its outline. 0 = Liquid Glass's outward
   * rim, 1 = a lens.
   */
  inward: number;
};

export const DEFAULT_GLASS: GlassStyle = {
  refraction: 80,
  bevel: 64,
  ior: 1.5,
  dispersion: 0.4,
  frost: 1.5,
  saturation: 1.35,
  brightness: 1.06,
  tint: "#ffffff",
  tintAmount: 0.06,
  specular: 0.9,
  lightAngle: 115,
  edgeWidth: 1.2,
  shadow: 0.25,
  shadowSoftness: 28,
  shadowOffset: 10,
  smooth: 0,
  inward: 0,
};

export type Backdrop =
  | { gradient: GradientProps }
  | { color: string }
  /** Any fragment shader built with glsl.ts `frag()`, e.g. WAVES_FRAGMENT with wavesUniforms(). */
  | { shader: { fragment: string; uniforms?: Uniforms } }
  /**
   * A backdrop the scene composes each frame on a 2D canvas, in composition px, from loaded images —
   * so glass can refract elements the scene draws (an avatar under its own glass bubble).
   */
  | { compose: { images: string[]; draw: (ctx: CanvasRenderingContext2D, images: HTMLImageElement[], width: number, height: number) => void } }
  | MediaInput;

const MAX_PANELS = 8;

const BLIT_FRAGMENT = frag(
  COVER,
  `
uniform sampler2D uSource;
uniform vec2 uSourceSize;
uniform vec4 uPlace;   // x, y (from the top), width, height in canvas px; width 0 = cover the canvas
uniform vec3 uGround;
void main() {
  if (uPlace.z <= 0.0) { outColor = vec4(texture(uSource, coverUv(vUv, uResolution, uSourceSize)).rgb, 1.0); return; }
  vec2 px = vec2(vUv.x * uResolution.x, (1.0 - vUv.y) * uResolution.y);
  vec2 uv = (px - uPlace.xy) / uPlace.zw;
  bool inside = all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0)));
  outColor = vec4(inside ? texture(uSource, vec2(uv.x, 1.0 - uv.y)).rgb : uGround, 1.0);
}
`,
);

const GLASS_FRAGMENT = frag(
  COLOR,
  SDF,
  `
uniform sampler2D uBackdrop;
uniform vec4 uRects[8];   // centre x, y, half width, half height (canvas px, y up)
uniform float uRadii[8];
uniform float uCount, uRefraction, uBevel, uIor, uDispersion, uFrost, uSaturation, uBrightness, uTintAmount;
uniform float uSpecular, uLight, uEdge, uShadow, uShadowSoft, uShadowOffset, uSmooth, uInward;
uniform vec3 uTint;

float scene(vec2 p) {
  float d = 1e5;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uCount) break;
    d = smin(d, sdRoundRect(p - uRects[i].xy, uRects[i].zw, uRadii[i]), uSmooth);
  }
  return d;
}

vec3 back(vec2 px, float lod) { return textureLod(uBackdrop, px / uResolution, lod).rgb; }

// Frost: mip level for the bulk of the blur, a ring of taps to round it off.
vec3 frosted(vec2 px, float r) {
  if (r < 0.5) return back(px, 0.0);
  float lod = max(log2(r) - 0.5, 0.0);
  vec3 acc = back(px, lod) * 2.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982 + 0.3926991;
    acc += back(px + vec2(cos(a), sin(a)) * r * 0.7, lod);
  }
  return acc / 10.0;
}

void main() {
  vec2 px = gl_FragCoord.xy;
  float d = scene(px);
  vec3 col = back(px, 0.0);

  if (uShadow > 0.0) {
    float ds = scene(px + vec2(0.0, uShadowOffset));
    col *= 1.0 - 0.55 * uShadow * exp(-max(ds, 0.0) / uShadowSoft) * smoothstep(-1.0, 1.0, d);
  }

  if (d < 1.0) {
    float e = max(-d, 0.0);
    vec2 g = vec2(scene(px + vec2(1.0, 0.0)) - scene(px - vec2(1.0, 0.0)), scene(px + vec2(0.0, 1.0)) - scene(px - vec2(0.0, 1.0)));
    vec2 n = g / max(length(g), 1e-4);          // outward normal of the outline

    // Dome profile h = 1 − k^p (k = 1 at the rim, 0 at the bevel's inner edge): the slope
    // ramps smoothly across the whole bevel, so the image bows toward the rim rather than
    // kinking at the edge; p > 2 steepens the last few pixels like a glass lip.
    float k = 1.0 - clamp(e / uBevel, 0.0, 1.0);
    float p = 2.6;
    float h = 1.0 - pow(k, p);
    float slope = p * pow(k, p - 1.0) * uRefraction / uBevel; // surface rise per px

    // Refract the view ray through the surface (Snell's law). The bend grows with the
    // slope, and the sample moves outward: the curved rim shows a compressed view of what
    // surrounds the glass, which is what makes the edge read as liquid.
    vec3 N = normalize(vec3(n * slope, 1.0));
    float depth = uRefraction * (0.35 + 0.65 * h);
    vec3 R = refract(vec3(0.0, 0.0, -1.0), N, 1.0 / uIor);
    vec2 disp = -R.xy / max(-R.z, 0.2) * depth;
    disp *= min(1.0, 2.5 * uBevel / max(length(disp), 1e-4)); // keep rim samples nearby
    // A lens samples toward its centre, magnifying what is under it and never reaching past the edge.
    if (uInward > 0.5) disp = -min(1.0, e / max(length(disp), 1e-4)) * disp;

    vec3 glass;
    glass.r = frosted(px + disp * (1.0 + uDispersion), uFrost).r;
    glass.g = frosted(px + disp, uFrost).g;
    glass.b = frosted(px + disp * (1.0 - uDispersion), uFrost).b;
    float l = luma(glass);
    glass = mix(vec3(l), glass, uSaturation) * uBrightness;
    glass = mix(glass, uTint, uTintAmount);

    // Light from the 3D surface: steep rims catch a highlight on the lit side, shade on the other.
    vec2 L = vec2(cos(radians(uLight)), sin(radians(uLight)));
    float facing = dot(n, L);
    float rim = 1.0 - N.z;
    float rimLight = pow(rim, 1.5) * max(facing, 0.0) * uSpecular * 0.85;
    float rimShade = pow(rim, 1.5) * max(-facing, 0.0) * 0.2;
    float edge = (1.0 - smoothstep(0.0, uEdge * 1.5, e)) * (0.4 + 0.6 * abs(facing)) * uSpecular;
    glass = glass * (1.0 - rimShade) + vec3(rimLight + edge * 0.75);

    col = mix(col, glass, 1.0 - smoothstep(-0.75, 0.75, d));
  }
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
);

type State = {
  gl: WebGL2RenderingContext;
  glass: WebGLProgram;
  blit: WebGLProgram;
  /** Backdrop shader programs by fragment source. */
  shaders: Map<string, WebGLProgram>;
  target: ReturnType<typeof createTarget>;
  media: WebGLTexture;
};

export type LiquidGlassProps = {
  backdrop: Backdrop;
  panels: GlassPanel[];
  glass?: Partial<GlassStyle>;
  /** Seconds; defaults to frame / fps. */
  time?: number;
  /** Render resolution relative to the composition. */
  resolution?: number;
  /** UI drawn on top of the glass (labels, icons), positioned in composition pixels. */
  children?: React.ReactNode;
  /**
   * Where an image or video backdrop sits, in composition px, with `ground` around it — so the glass
   * refracts exactly what the scene shows beneath it. Omitted, the backdrop covers the canvas.
   */
  placement?: { x: number; y: number; width: number; height: number; ground?: string };
};

export const LiquidGlass: React.FC<LiquidGlassProps> = ({ backdrop, panels, glass, time: timeProp, resolution = 1, children, placement }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef<State | null>(null);
  const mediaFrame = useRef<TexImageSource | null>(null);
  const composed = useRef<{ canvas: HTMLCanvasElement | null; images: (HTMLImageElement | null)[] }>({ canvas: null, images: [] });
  const w = Math.round(width * resolution);
  const h = Math.round(height * resolution);
  const time = timeProp ?? frame / fps;
  const style = { ...DEFAULT_GLASS, ...glass };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!state.current) {
      const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw new Error("WebGL2 unavailable: render with chromiumOptions.gl = 'angle' (.agents/skills/apply-effect/references/rules.md#traps)");
      bindFullscreenTriangle(gl);
      state.current = {
        gl,
        glass: createProgram(gl, GLASS_FRAGMENT),
        blit: createProgram(gl, BLIT_FRAGMENT),
        shaders: new Map(),
        target: createTarget(gl, canvas.width, canvas.height),
        media: createTexture(gl),
      };
    }
    const { gl, target } = state.current;
    const base = { uResolution: [canvas.width, canvas.height] as const, uTime: time, uFrame: Math.round(time * fps) };

    // Pass 1: backdrop into a mipmapped texture.
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.width, target.height);
    const shader =
      "gradient" in backdrop ? { fragment: GRADIENT_FRAGMENT, uniforms: gradientUniforms(backdrop.gradient) } : "shader" in backdrop ? backdrop.shader : null;
    if (shader) {
      const { shaders } = state.current;
      if (!shaders.has(shader.fragment)) shaders.set(shader.fragment, createProgram(gl, shader.fragment));
      const program = shaders.get(shader.fragment)!;
      gl.useProgram(program);
      setUniforms(gl, program, { ...shader.uniforms, ...base });
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else if ("color" in backdrop) {
      const [r, g, b] = hexToSrgb(backdrop.color);
      gl.clearColor(r, g, b, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    } else if ("compose" in backdrop || mediaFrame.current) {
      if ("compose" in backdrop) {
        // Compose the backdrop on a 2D canvas at the render size, once every image has loaded.
        const imgs = backdrop.compose.images.map((_, i) => composed.current.images[i] ?? null);
        if (imgs.some((im) => !im)) return;
        const c = (composed.current.canvas ??= document.createElement("canvas"));
        if (c.width !== w || c.height !== h) Object.assign(c, { width: w, height: h });
        const ctx = c.getContext("2d")!;
        ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        backdrop.compose.draw(ctx, imgs as HTMLImageElement[], width, height);
        mediaFrame.current = c;
      }
      const source = mediaFrame.current;
      if (!source) return;
      gl.useProgram(state.current.blit);
      gl.activeTexture(gl.TEXTURE0);
      uploadTexture(gl, state.current.media, source);
      const place: [number, number, number, number] = placement && !("compose" in backdrop) ? [placement.x * resolution, placement.y * resolution, placement.width * resolution, placement.height * resolution] : [0, 0, 0, 0];
      setUniforms(gl, state.current.blit, { ...base, uSourceSize: sourceSize(source), uPlace: place, uGround: hexToSrgb(placement?.ground ?? "#ffffff") });
      gl.uniform1i(gl.getUniformLocation(state.current.blit, "uSource"), 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindTexture(gl.TEXTURE_2D, target.tex);
    gl.generateMipmap(gl.TEXTURE_2D);

    // Pass 2: glass over the backdrop, to the canvas.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(state.current.glass);
    const list = panels.slice(0, MAX_PANELS);
    const rects: number[] = [];
    const radii: number[] = [];
    for (let i = 0; i < MAX_PANELS; i++) {
      const p = list[i];
      rects.push(p ? (p.x + p.width / 2) * resolution : 0, p ? (height - p.y - p.height / 2) * resolution : 0, p ? (p.width / 2) * resolution : 0, p ? (p.height / 2) * resolution : 0);
      radii.push(p ? (p.radius ?? Math.min(p.width, p.height) / 2) * resolution : 0);
    }
    setUniforms(gl, state.current.glass, {
      ...base,
      uRects: { v4: rects },
      uRadii: { f: radii },
      uCount: list.length,
      uRefraction: style.refraction * resolution,
      uBevel: Math.max(1, style.bevel * resolution),
      uIor: Math.max(1, style.ior),
      uDispersion: style.dispersion * 0.3,
      uFrost: style.frost * resolution,
      uSaturation: style.saturation,
      uBrightness: style.brightness,
      uTint: hexToSrgb(style.tint),
      uTintAmount: style.tintAmount,
      uSpecular: style.specular,
      uLight: style.lightAngle,
      uEdge: style.edgeWidth * resolution,
      uShadow: style.shadow,
      uShadowSoft: Math.max(1, style.shadowSoftness * resolution),
      uShadowOffset: style.shadowOffset * resolution,
      uSmooth: style.smooth * resolution,
      uInward: style.inward,
    });
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, target.tex);
    gl.uniform1i(gl.getUniformLocation(state.current.glass, "uBackdrop"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const drawRef = useRef(draw);
  drawRef.current = draw;
  useLayoutEffect(draw);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (mounted.current) return;
        state.current?.gl.getExtension("WEBGL_lose_context")?.loseContext();
        state.current = null;
      });
    };
  }, []);

  const media = "video" in backdrop || "image" in backdrop ? (backdrop as MediaInput) : null;
  return (
    <AbsoluteFill>
      {"compose" in backdrop &&
        backdrop.compose.images.map((src, i) => (
          <Img
            key={src}
            src={/^(https?:|data:|\/)/.test(src) ? src : staticFile(src)}
            onLoad={(e) => {
              composed.current.images[i] = e.currentTarget;
              drawRef.current();
            }}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
          />
        ))}
      {media && (
        <MediaFeed
          source={media}
          onFrame={(f) => {
            mediaFrame.current = f;
            drawRef.current();
          }}
        />
      )}
      <canvas ref={canvasRef} width={w} height={h} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {children}
    </AbsoluteFill>
  );
};
