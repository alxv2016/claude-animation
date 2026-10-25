// Media inspection through Remotion's bundled ffprobe/ffmpeg: present wherever the kit is
// installed, unlike a system ffmpeg (docs/MOTION_KIT.md §3).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
/** Run `remotion <tool>` from the project when it has @remotion/cli, else from the kit. */
function remotion(tool, args) {
  const cwd = fs.existsSync(path.resolve("node_modules/@remotion/cli")) ? process.cwd() : KIT;
  return spawnSync("npx", ["remotion", tool, ...args], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/** Streams and format of a media file, from ffprobe. */
export function probe(file) {
  const r = remotion("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path.resolve(file)]);
  if (r.status !== 0) throw new Error(`ffprobe failed for ${file}: ${r.stderr.trim()}`);
  const json = JSON.parse(r.stdout);
  const video = json.streams.find((s) => s.codec_type === "video");
  const audio = json.streams.find((s) => s.codec_type === "audio");
  const [num, den] = (video?.r_frame_rate ?? "30/1").split("/").map(Number);
  const duration = Number(json.format?.duration ?? video?.duration ?? 0);
  const fps = num / (den || 1);
  return {
    video,
    audio,
    format: json.format,
    width: video ? Number(video.width) : 0,
    height: video ? Number(video.height) : 0,
    fps,
    duration,
    frames: Number(video?.nb_frames) || Math.round(duration * fps),
  };
}

/** Integrated loudness and true peak, from ffmpeg's loudnorm analysis. */
export function loudness(file) {
  const r = remotion("ffmpeg", ["-hide_banner", "-i", path.resolve(file), "-vn", "-af", "loudnorm=I=-14:TP=-1:print_format=json", "-f", "null", "-"]);
  const m = /\{[\s\S]*"input_i"[\s\S]*?\}/.exec(r.stderr);
  if (!m) return null;
  const j = JSON.parse(m[0]);
  return { lufs: Number(j.input_i), truePeak: Number(j.input_tp) };
}
