// motion-kit filter <video> --effect dither|pixel|gradient-map [--params '<json>'] [--out file] [--crf n] [--no-audio]
// Renders the FilterVideo composition over a whole video at its own size, rate and length.
import fs from "node:fs";
import path from "node:path";
import { probe } from "../lib/media.mjs";
import { fileURLToPath } from "node:url";
import { film, options } from "../lib/render-core.mjs";

const ENTRY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../entries/filter.tsx");

const EFFECTS = ["dither", "pixel", "gradient-map"];

export async function filter(args) {
  const opts = options(args);
  const input = opts._[0];
  const effect = opts.effect ?? "dither";
  if (!input || !EFFECTS.includes(effect)) {
    throw new Error(`usage: motion-kit filter <video> --effect ${EFFECTS.join("|")} [--params '<json>'] [--out file] [--crf n] [--no-audio]`);
  }
  if (!fs.existsSync(input)) throw new Error(`no such file: ${input}`);
  // staticFile() only serves public/: use the file in place if it is there, else copy it in.
  const publicDir = path.resolve("public");
  let src = path.relative(publicDir, path.resolve(input));
  if (src.startsWith("..") || path.isAbsolute(src)) {
    src = path.posix.join(".motion-kit", "inputs", path.basename(input));
    fs.mkdirSync(path.join(publicDir, ".motion-kit", "inputs"), { recursive: true });
    fs.copyFileSync(input, path.join(publicDir, src));
  }
  const info = probe(input);
  if (!info.video) throw new Error(`${input} has no video stream`);
  const params = opts.params ? JSON.parse(opts.params) : {};
  const out = opts.out ?? `out/${path.parse(input).name}-${effect}.mp4`;
  const inputProps = {
    src: src.split(path.sep).join("/"),
    effect,
    params,
    audio: Boolean(info.audio) && !opts["no-audio"],
    width: info.width,
    height: info.height,
    fps: Math.round(info.fps * 1000) / 1000,
    durationInFrames: info.frames,
  };
  console.log(`${input}: ${info.width}×${info.height}, ${inputProps.fps} fps, ${info.frames} frames, ${info.audio ? "with" : "no"} audio → ${effect}`);
  console.log(await film("FilterVideo", { inputProps, out, crf: opts.crf ? Number(opts.crf) : undefined, entry: ENTRY }));
}
