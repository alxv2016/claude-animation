// Minimal WebGL2 helpers shared by every effect: program compilation, a
// fullscreen triangle, typed uniform upload, textures and framebuffers.

export type UniformValue =
  | number
  | readonly [number, number]
  | readonly [number, number, number]
  | readonly [number, number, number, number]
  | { f: readonly number[] }
  | { v2: readonly number[] }
  | { v3: readonly number[] }
  | { v4: readonly number[] };
export type Uniforms = Record<string, UniformValue>;

export const VERTEX = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export function createProgram(gl: WebGL2RenderingContext, fragment: string) {
  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? "";
      const lines = src.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n");
      throw new Error(`Shader compile failed: ${log}\n${lines}`);
    }
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
  return program;
}

/** One triangle that covers the viewport; bound once per context at attribute 0. */
export function bindFullscreenTriangle(gl: WebGL2RenderingContext) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  return vao;
}

export function setUniforms(gl: WebGL2RenderingContext, program: WebGLProgram, uniforms: Uniforms) {
  for (const [name, value] of Object.entries(uniforms)) {
    const loc = gl.getUniformLocation(program, name);
    if (!loc) continue; // optimised out or unused
    if (typeof value === "number") gl.uniform1f(loc, value);
    else if ("f" in value) gl.uniform1fv(loc, value.f);
    else if ("v2" in value) gl.uniform2fv(loc, value.v2);
    else if ("v3" in value) gl.uniform3fv(loc, value.v3);
    else if ("v4" in value) gl.uniform4fv(loc, value.v4);
    else if (value.length === 2) gl.uniform2f(loc, value[0], value[1]);
    else if (value.length === 3) gl.uniform3f(loc, value[0], value[1], value[2]);
    else gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
  }
}

export function createTexture(gl: WebGL2RenderingContext, mipmaps = false) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/** Uploads an image, video frame or canvas; rows flipped so uv (0,0) is bottom-left like gl_FragCoord. */
export function uploadTexture(gl: WebGL2RenderingContext, tex: WebGLTexture, source: TexImageSource, mipmaps = false) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
}

/** A colour framebuffer of the given size; its texture is mipmappable for frosted-glass blur. */
export function createTarget(gl: WebGL2RenderingContext, width: number, height: number) {
  const tex = createTexture(gl, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, tex, width, height };
}

/** Source size for an uploaded texture, for aspect-correct "cover" sampling. */
export function sourceSize(source: TexImageSource): [number, number] {
  if (source instanceof HTMLVideoElement) return [source.videoWidth, source.videoHeight];
  if (source instanceof HTMLImageElement) return [source.naturalWidth, source.naturalHeight];
  if ("displayWidth" in source) return [source.displayWidth, source.displayHeight];
  return [(source as { width: number }).width, (source as { height: number }).height];
}
