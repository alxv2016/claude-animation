// node render.mjs [film] [composition]       full render → out/<composition>.mp4 (default Reel → out/reel.mp4)
// node render.mjs sheet [phase]               reel contact sheet, one frame per beat → out/sheet.png
// node render.mjs strip <b,b,...>             reel sheet of chosen beats → out/strip.png
// node render.mjs frames <composition> <f,f,…> any composition's frames in one grid → out/frames-<composition>.png
// node render.mjs still <frame> [composition] single frame → out/frame-<n>.png
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const [mode = "film", arg, arg2] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
// angle: WebGL effects render on the GPU and identically run to run (docs/EFFECTS.md §3).
// Fixed port: Remotion's port probe can collide with a running Studio on :3000.
const common = { serveUrl, chromiumOptions: { gl: "angle" }, port: Number(process.env.RENDER_PORT ?? 3555) };
const select = (id, inputProps) => selectComposition({ ...common, id, inputProps });

if (mode === "sheet" || mode === "strip") {
  // strip: comma-separated beats, e.g. node render.mjs strip 3.5,3.6,3.7
  const inputProps = mode === "strip" ? { phase: 0, beats: arg.split(",").map(Number) } : { phase: Number(arg ?? 0) };
  const composition = await select("ContactSheet", inputProps);
  const output = mode === "strip" ? "out/strip.png" : `out/sheet${arg ? `-${arg}` : ""}.png`;
  await renderStill({ ...common, composition, inputProps, output, overwrite: true });
  console.log(output);
} else if (mode === "frames") {
  const inputProps = { target: arg, frames: arg2.split(",").map(Number) };
  const composition = await select("FrameSheet", inputProps);
  const output = `out/frames-${arg}.png`;
  await renderStill({ ...common, composition, inputProps, output, overwrite: true });
  console.log(output);
} else if (mode === "still") {
  const composition = await select(arg2 ?? "Reel");
  const output = `out/frame-${arg2 ? `${arg2}-` : ""}${arg}.png`;
  await renderStill({ ...common, composition, frame: Number(arg), output, overwrite: true });
  console.log(output);
} else {
  const id = arg ?? "Reel";
  const composition = await select(id);
  const outputLocation = id === "Reel" ? "out/reel.mp4" : `out/${id}.mp4`;
  await renderMedia({
    ...common,
    composition,
    codec: "h264",
    crf: 16,
    pixelFormat: "yuv420p",
    audioCodec: "aac",
    audioBitrate: "320k",
    concurrency: 3,
    outputLocation,
    onProgress: ({ progress }) => process.stdout.write(`\r${Math.round(progress * 100)}%`),
  });
  console.log(`\n${outputLocation}`);
}
