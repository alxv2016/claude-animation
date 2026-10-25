// motion-kit score <film dir | score.mjs>   — synthesize a film's score, master it, measure its grid
// motion-kit beats <audio> [--beats n] [--band low|full] [--bpm min-max] [--out beats.json]
// motion-kit master <audio> [--out file.wav] [--lufs -14]   — loudness-normalise a supplied track
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createSession } from "../../audio/engine.mjs";
import { measureBeats } from "../../audio/beats.mjs";
import { SR, integratedLufs, lookaheadLimit, readWav, writeWav } from "../../audio/dsp.mjs";
import { options } from "../lib/render-core.mjs";

export async function score(args) {
  const opts = options(args);
  const target = opts._[0];
  if (!target) throw new Error("usage: motion-kit score <film dir | score.mjs>");
  const file = fs.statSync(target).isDirectory() ? path.join(target, "score.mjs") : target;
  const dir = path.dirname(file);
  const { default: spec } = await import(pathToFileURL(path.resolve(file)).href);
  const duration = spec.duration ?? (spec.bars * (spec.beatsPerBar ?? 4) * 60) / spec.bpm + (spec.tail ?? 0);
  const session = createSession({ bpm: spec.bpm, duration, seed: spec.seed ?? 1337, target: spec.lufs ?? -14 });
  const t0 = Date.now();
  spec.compose(session);
  const result = session.master();
  const output = spec.output ?? path.join("public", path.basename(path.resolve(dir)), "score.wav");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  writeWav(output, result.channels, fs);
  fs.writeFileSync(path.join(dir, "cues.json"), JSON.stringify({ bpm: spec.bpm, duration, events: session.events }, null, 1) + "\n");
  console.log(`${output}  ${duration.toFixed(2)} s  ${result.lufs.toFixed(2)} LUFS  peak ${result.peakDb.toFixed(2)} dBFS  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  console.log(`${path.join(dir, "cues.json")}  ${session.events.length} cues`);
  // A motion-kit film: point it at the score and size it to the score's length.
  const filmFile = path.join(dir, "film.json");
  if (fs.existsSync(filmFile)) {
    const film = JSON.parse(fs.readFileSync(filmFile, "utf8"));
    film.audio = path.relative("public", output).split(path.sep).join("/");
    film.durationInFrames = Math.ceil(duration * film.fps);
    fs.writeFileSync(filmFile, JSON.stringify(film, null, 2) + "\n");
    console.log(`${filmFile}  audio ${film.audio}, ${film.durationInFrames} frames`);
  }

  const beatsFile = path.join(dir, "beats.json");
  const count = spec.beats ?? Math.round((duration - (spec.tail ?? 0)) * (spec.bpm / 60));
  const grid = measureBeats(output, { beats: count, band: spec.beatBand ?? "low", minBpm: spec.minBpm ?? 90, maxBpm: spec.maxBpm ?? 180, source: output });
  fs.writeFileSync(beatsFile, JSON.stringify(grid, null, 2) + "\n");
  console.log(`${beatsFile}  ${grid.detectedBeats.length}/${count} beats detected  ${grid.bpm} BPM  offset ${(grid.offset * 1000).toFixed(1)} ms  max residual ${grid.maxResidualMs} ms`);
}

/** Decodes any audio or video file to a 48 kHz stereo WAV with Remotion's ffmpeg; returns the WAV path. */
function toWav(file) {
  if (/\.wav$/i.test(file)) return file;
  const out = path.join("out", ".audio", `${path.parse(file).name}.wav`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const cwd = fs.existsSync(path.resolve("node_modules/@remotion/cli")) ? process.cwd() : undefined;
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-hide_banner", "-v", "error", "-i", path.resolve(file), "-vn", "-ac", "2", "-ar", String(SR), "-c:a", "pcm_s16le", "-y", path.resolve(out)], { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`could not decode ${file}: ${r.stderr}`);
  return out;
}

export function beats(args) {
  const opts = options(args);
  const file = opts._[0];
  if (!file) throw new Error("usage: motion-kit beats <audio> [--beats n] [--band low|full] [--bpm 90-180] [--out beats.json]");
  const [minBpm, maxBpm] = String(opts.bpm ?? "90-180").split("-").map(Number);
  const grid = measureBeats(toWav(file), { beats: opts.beats ? Number(opts.beats) : undefined, band: opts.band ?? "low", minBpm, maxBpm, source: file });
  const out = opts.out ?? "beats.json";
  fs.writeFileSync(out, JSON.stringify(grid, null, 2) + "\n");
  console.log(`${out}  ${grid.beats.length} beats  ${grid.bpm} BPM  offset ${(grid.offset * 1000).toFixed(1)} ms  ${grid.detectedBeats.length} detected  max residual ${grid.maxResidualMs} ms`);
}

export function master(args) {
  const opts = options(args);
  const file = opts._[0];
  if (!file) throw new Error("usage: motion-kit master <audio> [--out file.wav] [--lufs -14]");
  const target = opts.lufs ? Number(opts.lufs) : -14;
  const channels = readWav(toWav(file), fs);
  const ceiling = 10 ** (-1.5 / 20);
  const peakLimit = (gain) => lookaheadLimit(channels, gain, ceiling);
  let gain = 10 ** ((target - integratedLufs(channels)) / 20);
  let out = peakLimit(gain);
  for (let pass = 0; pass < 6; pass++) {
    const l = integratedLufs(out);
    if (Math.abs(l - target) <= 0.05) break;
    gain *= 10 ** ((target - l) / 20);
    out = peakLimit(gain);
  }
  const dest = opts.out ?? path.join("public", `${path.parse(file).name}-mastered.wav`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  writeWav(dest, out, fs);
  console.log(`${dest}  ${integratedLufs(out).toFixed(2)} LUFS (target ${target})`);
}
