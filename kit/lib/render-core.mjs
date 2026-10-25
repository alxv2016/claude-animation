// Shared render settings and helpers for the CLI and render.mjs: one place for the GL backend,
// the port and the master encoding (docs/MOTION_KIT.md §5).
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

// angle: WebGL effects render on the GPU and identically run to run.
export const CHROMIUM = { gl: "angle" };
// Fixed port: Remotion's port probe can collide with a running Studio on :3000.
export const PORT = Number(process.env.RENDER_PORT ?? 3555);
/** Master encode; `--crf 20`–`23` makes a smaller delivery copy of grainy films. */
export const MASTER = { codec: "h264", crf: 16, pixelFormat: "yuv420p", audioCodec: "aac", audioBitrate: "320k" };

const bundles = new Map();
/**
 * Bundles an entry once per process: the project's src/index.ts by default, or a kit entry
 * (kit/entries/) that still serves the project's public/ folder.
 */
export async function project(entry = "src/index.ts") {
  const entryPoint = path.resolve(entry);
  if (!bundles.has(entryPoint)) bundles.set(entryPoint, await bundle({ entryPoint, publicDir: path.resolve("public"), rootDir: process.cwd() }));
  return bundles.get(entryPoint);
}

export async function select(id, inputProps = {}, entry) {
  const url = await project(entry);
  const composition = await selectComposition({ serveUrl: url, id, inputProps, chromiumOptions: CHROMIUM, port: PORT });
  return { serveUrl: url, composition, inputProps };
}

export async function film(id, { inputProps = {}, out, crf = MASTER.crf, scale = 1, onProgress, entry } = {}) {
  const { serveUrl: url, composition } = await select(id, inputProps, entry);
  const outputLocation = out ?? `out/${id}.mp4`;
  await renderMedia({
    serveUrl: url,
    composition,
    inputProps,
    ...MASTER,
    crf,
    scale,
    concurrency: 3,
    chromiumOptions: CHROMIUM,
    port: PORT,
    outputLocation,
    onProgress: onProgress ?? (({ progress }) => process.stdout.write(`\r${Math.round(progress * 100)}%`)),
  });
  process.stdout.write("\n");
  return outputLocation;
}

export async function still(id, frame, { inputProps = {}, out, scale = 1, imageFormat = "png" } = {}) {
  const { serveUrl: url, composition } = await select(id, inputProps);
  const output = out ?? `out/frame-${id}-${frame}.${imageFormat === "jpeg" ? "jpg" : "png"}`;
  await renderStill({ serveUrl: url, composition, inputProps, frame, output, overwrite: true, scale, imageFormat, chromiumOptions: CHROMIUM, port: PORT });
  return output;
}

/** Reads `--name value` and `--flag` options from an argument list. */
export function options(args) {
  const opts = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) opts._.push(a);
    else if (args[i + 1] !== undefined && !args[i + 1].startsWith("--")) opts[a.slice(2)] = args[++i];
    else opts[a.slice(2)] = true;
  }
  return opts;
}
