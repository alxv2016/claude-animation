// This repo's render entry (npm run render / sheet). Projects use the CLI: npx motion-kit render.
// node render.mjs [film] [composition]       full render → out/<composition>.mp4 (default Reel → out/reel.mp4)
// node render.mjs sheet [phase]               reel contact sheet, one frame per beat → out/sheet.png
// node render.mjs strip <b,b,...>             reel sheet of chosen beats → out/strip.png
// node render.mjs frames <composition> <f,f,…> any registered composition's frames in one grid → out/frames-<composition>.png
// node render.mjs still <frame> [composition] single frame → out/frame-<n>.png
import { film, still } from "./kit/lib/render-core.mjs";

const [mode = "film", arg, arg2] = process.argv.slice(2);

if (mode === "sheet" || mode === "strip") {
  // strip: comma-separated beats, e.g. node render.mjs strip 3.5,3.6,3.7
  const inputProps = mode === "strip" ? { phase: 0, beats: arg.split(",").map(Number) } : { phase: Number(arg ?? 0) };
  const out = mode === "strip" ? "out/strip.png" : `out/sheet${arg ? `-${arg}` : ""}.png`;
  console.log(await still("ContactSheet", 0, { inputProps, out }));
} else if (mode === "frames") {
  const inputProps = { target: arg, frames: arg2.split(",").map(Number) };
  console.log(await still("FrameSheet", 0, { inputProps, out: `out/frames-${arg}.png` }));
} else if (mode === "still") {
  console.log(await still(arg2 ?? "Reel", Number(arg), { out: `out/frame-${arg2 ? `${arg2}-` : ""}${arg}.png` }));
} else {
  const id = arg ?? "Reel";
  console.log(await film(id, { out: id === "Reel" ? "out/reel.mp4" : `out/${id}.mp4` }));
}
