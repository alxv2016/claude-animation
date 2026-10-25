// motion-kit verify <file> [--lufs -14]: checks a rendered film before it is delivered.
// Exit code 1 when a check fails; warnings do not fail.
import { loudness, probe } from "../lib/media.mjs";

export function verify(args) {
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("usage: motion-kit verify <file> [--lufs -14]");
  const target = args.includes("--lufs") ? Number(args[args.indexOf("--lufs") + 1]) : -14;
  const info = probe(file);
  const v = info.video;
  const a = info.audio;
  const bitrate = Number(info.format?.bit_rate ?? 0) / 1e6;
  const lines = [];
  let failed = false;
  const check = (ok, label, fix) => {
    if (!ok) failed = true;
    lines.push(`${ok ? "ok  " : "FAIL"} ${label}${ok || !fix ? "" : `\n       → ${fix}`}`);
  };
  const warn = (label) => lines.push(`warn ${label}`);

  if (v) check(true, `video: ${v.codec_name} ${v.pix_fmt} ${info.width}×${info.height} ${info.fps.toFixed(2)} fps, ${info.frames} frames, ${info.duration.toFixed(2)} s`);
  else warn("no video stream (audio-only file)");
  if (v) check(v.codec_name === "h264" && v.pix_fmt === "yuv420p", "H.264 yuv420p (plays everywhere)", "render with motion-kit render (codec h264, pixel format yuv420p)");
  if (a) {
    check(true, `audio: ${a.codec_name}, ${a.channels} ch, ${a.sample_rate} Hz, ${Number(a.duration ?? info.duration).toFixed(2)} s`);
    const l = loudness(file);
    if (l) {
      check(Math.abs(l.lufs - target) <= 1, `loudness ${l.lufs.toFixed(1)} LUFS (target ${target} ± 1)`, "re-master the score to the target");
      check(l.truePeak <= -1, `true peak ${l.truePeak.toFixed(1)} dBTP (≤ −1)`, "lower the limiter ceiling");
    }
    if (a.codec_name === "aac") warn("AAC audio: VS Code's built-in preview plays it silent — check in QuickTime or a browser");
  } else warn("no audio track");
  if (!v) {
    console.log(lines.join("\n"));
    if (failed) process.exit(1);
    return;
  }
  if (bitrate > 40) warn(`bitrate ${bitrate.toFixed(0)} Mb/s — grain or dither; for delivery re-render with --crf 20–23`);
  else lines.push(`ok   bitrate ${bitrate.toFixed(1)} Mb/s`);

  console.log(lines.join("\n"));
  if (failed) process.exit(1);
}
