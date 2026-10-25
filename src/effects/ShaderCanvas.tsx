import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { bindFullscreenTriangle, createProgram, createTexture, setUniforms, sourceSize, uploadTexture, type Uniforms } from "./gl";

// A WebGL2 layer that paints one fullscreen fragment shader per frame. It holds GL
// resources between renders, never visual state: every pixel is a function of the
// uniforms, which derive from the frame number (.agents/skills/apply-effect/references/rules.md).

export type ShaderHandle = { draw: () => void };

export type ShaderCanvasProps = {
  fragment: string;
  uniforms: Uniforms;
  /** Seconds; defaults to the current frame / fps. Pass it to freeze or retime an effect. */
  time?: number;
  /** Sampler name → source, or a getter read at draw time (for media that arrives later).
   *  Each also gets a `<name>Size` vec2 uniform in pixels. */
  textures?: Record<string, TexImageSource | null | undefined | (() => TexImageSource | null)>;
  /** Render resolution relative to the composition (0.5 renders a quarter of the pixels). */
  scale?: number;
  /** Upscale with nearest-neighbour, for pixel and dither effects rendered below full size. */
  pixelated?: boolean;
  style?: React.CSSProperties;
};

type GLState = { gl: WebGL2RenderingContext; program: WebGLProgram; fragment: string; textures: Map<string, WebGLTexture> };

export const ShaderCanvas = forwardRef<ShaderHandle, ShaderCanvasProps>(function ShaderCanvas(props, ref) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef<GLState | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const scale = props.scale ?? 1;
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const time = props.time ?? frame / fps;
  const frameIndex = Math.round(time * fps);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = latest.current;
    if (!state.current || state.current.fragment !== p.fragment) {
      const gl = state.current?.gl ?? canvas.getContext("webgl2", { preserveDrawingBuffer: true, premultipliedAlpha: true, antialias: false });
      if (!gl) throw new Error("WebGL2 unavailable: render with chromiumOptions.gl = 'angle' (.agents/skills/apply-effect/references/rules.md#traps)");
      bindFullscreenTriangle(gl);
      state.current = { gl, program: createProgram(gl, p.fragment), fragment: p.fragment, textures: state.current?.textures ?? new Map() };
    }
    const { gl, program, textures } = state.current;
    gl.useProgram(program);
    gl.viewport(0, 0, canvas.width, canvas.height);
    setUniforms(gl, program, { ...p.uniforms, uResolution: [canvas.width, canvas.height], uTime: time, uFrame: frameIndex });
    Object.entries(p.textures ?? {}).forEach(([name, entry], unit) => {
      const source = typeof entry === "function" ? entry() : entry;
      if (!textures.has(name)) textures.set(name, createTexture(gl));
      gl.activeTexture(gl.TEXTURE0 + unit);
      const tex = textures.get(name)!;
      if (source) {
        uploadTexture(gl, tex, source);
        setUniforms(gl, program, { [`${name}Size`]: sourceSize(source) });
      } else gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(program, name), unit);
    });
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  useImperativeHandle(ref, () => ({ draw }));
  useLayoutEffect(draw);
  // Free the context on unmount: Chrome keeps only ~16 live WebGL contexts per page.
  // Released after the commit, so a StrictMode unmount/remount keeps its context.
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

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: props.pixelated ? "pixelated" : "auto", ...props.style }}
    />
  );
});
