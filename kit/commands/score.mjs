// motion-kit score <film dir | score.mjs>   — synthesize a film's sound effects, mix them over the
//   user's track if there is one, master, and write the beat grid
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
  const beatsPerBar = spec.beatsPerBar ?? 4;

  // The user's music track, if any: measured first, so `beat(n)` places effects on what the ear hears.
  let bed = null;
  let measured = null;
  if (spec.track) {
    const wav = toWav(spec.track);
    measured = measureBeats(wav, { band: spec.beatBand ?? "low", minBpm: spec.minBpm ?? 70, maxBpm: spec.maxBpm ?? 180, source: spec.track, beatsPerBar, details: true });
    bed = readWav(wav, fs);
    if (bed.length === 1) bed = [bed[0], bed[0]];
    const gain = 10 ** (((spec.trackLufs ?? -16) - integratedLufs(bed)) / 20);
    bed = bed.map((ch) => ch.map((v) => v * gain));
  }
  const period = measured ? measured.period : 60 / spec.bpm;
  const offset = measured ? measured.offset : 0;
  const duration = spec.duration ?? offset + spec.bars * beatsPerBar * period + (spec.tail ?? 0);
  const music = spec.music === true; // the reel's own score only (R13)
  // Sound effects are all transient: AAC turns a −1.5 dBFS sample peak into overs above −1 dBTP, so an
  // effects-only master gets more headroom; a score with music or a track keeps −1.5 (measured: −0.7
  // dBTP after AAC at −1.5 for 52 effects).
  const ceilingDb = spec.ceilingDb ?? (music || bed ? -1.5 : -2.5);
  const session = createSession({ bpm: 60 / period, duration, seed: spec.seed ?? 1337, target: spec.lufs ?? -14, ceilingDb, music, bed, grid: measured && { offset, period } });
  const t0 = Date.now();
  spec.compose(session);
  const result = session.master();
  const output = spec.output ?? path.join("public", path.basename(path.resolve(dir)), "score.wav");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  writeWav(output, result.channels, fs);
  fs.writeFileSync(path.join(dir, "cues.json"), JSON.stringify({ bpm: +(60 / period).toFixed(3), duration, events: session.events }, null, 1) + "\n");
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

  // The grid: measured from the user's track; measured from the WAV for a score with a kick (the
  // reel); otherwise the planned grid, which is exact because every effect was placed at beat(n).
  const beatsFile = path.join(dir, "beats.json");
  const count = spec.beats ?? Math.round((duration - offset - (spec.tail ?? 0)) / period);
  let grid;
  if (measured) {
    const within = (t) => t < duration;
    grid = { ...measured, beats: measured.beats.slice(0, count), detectedBeats: measured.detectedBeats.filter((k) => k < count), downbeats: measured.downbeats.filter(within), onsets: measured.onsets.filter(within) };
  } else if (music) {
    grid = measureBeats(output, { beats: count, band: spec.beatBand ?? "low", minBpm: spec.minBpm ?? 90, maxBpm: spec.maxBpm ?? 180, source: output });
  } else {
    grid = { source: "planned", bpm: spec.bpm, period: +period.toFixed(6), offset: 0, beats: Array.from({ length: count }, (_, i) => +(i * period).toFixed(6)) };
  }
  fs.writeFileSync(beatsFile, JSON.stringify(grid, null, 2) + "\n");
  if (grid.source === "planned") console.log(`${beatsFile}  ${count} beats  ${grid.bpm} BPM  planned grid (effects only, placed exactly on it)`);
  else console.log(`${beatsFile}  ${grid.detectedBeats.length}/${count} beats detected  ${grid.bpm} BPM  offset ${(grid.offset * 1000).toFixed(1)} ms  max residual ${grid.maxResidualMs} ms${grid.downbeats ? `  ${grid.downbeats.length} downbeats, ${grid.onsets.length} onsets` : ""}`);
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
  const grid = measureBeats(toWav(file), { beats: opts.beats ? Number(opts.beats) : undefined, band: opts.band ?? "low", minBpm, maxBpm, source: file, details: true });
  const out = opts.out ?? "beats.json";
  fs.writeFileSync(out, JSON.stringify(grid, null, 2) + "\n");
  console.log(`${out}  ${grid.beats.length} beats  ${grid.bpm} BPM  offset ${(grid.offset * 1000).toFixed(1)} ms  ${grid.detectedBeats.length} detected  max residual ${grid.maxResidualMs} ms  ${grid.downbeats.length} downbeats, ${grid.onsets.length} onsets`);
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
