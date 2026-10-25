// motion-kit reference <video> [--name n] [--every 0.5] [--rate 10]   (--rate: motion sampling, per second)
// Studies a reference video's grammar (capture-reference-style skill): frames every 0.5 s and a
// labelled contact image to look at, plus measured cuts and shot lengths, motion energy, palette,
// tone and grain in refs/<name>/analysis.json. Fonts, transitions and camera moves are judged from
// the frames; the numbers keep those judgements honest.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ensureBrowser } from "@remotion/renderer";
import { chromium } from "playwright-core";
import { probe } from "../lib/media.mjs";
import { readPng } from "../lib/png.mjs";
import { options } from "../lib/render-core.mjs";

function ffmpeg(args) {
  const cwd = fs.existsSync(path.resolve("node_modules/@remotion/cli")) ? process.cwd() : undefined;
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-hide_banner", "-v", "error", ...args], { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function oklab(r, g, b) {
  [r, g, b] = [r, g, b].map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const hex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** Deterministic k-means in OKLab; returns clusters with mean sRGB colour and share. */
function palette(samples, k = 8) {
  const centres = Array.from({ length: k }, (_, i) => samples[Math.floor(((i + 0.5) * samples.length) / k)].lab.slice());
  let assign = new Int32Array(samples.length);
  for (let iter = 0; iter < 12; iter++) {
    samples.forEach((s, i) => {
      let best = 0, bd = Infinity;
      centres.forEach((c, j) => { const d = (s.lab[0] - c[0]) ** 2 + (s.lab[1] - c[1]) ** 2 + (s.lab[2] - c[2]) ** 2; if (d < bd) { bd = d; best = j; } });
      assign[i] = best;
    });
    centres.forEach((c, j) => {
      const members = samples.filter((_, i) => assign[i] === j);
      if (members.length) for (let d = 0; d < 3; d++) c[d] = members.reduce((a, m) => a + m.lab[d], 0) / members.length;
    });
  }
  return centres
    .map((c, j) => {
      const members = samples.filter((_, i) => assign[i] === j);
      const rgb = [0, 1, 2].map((d) => members.reduce((a, m) => a + m.rgb[d], 0) / Math.max(1, members.length));
      return { hex: hex(rgb), share: +(members.length / samples.length).toFixed(3), lightness: +c[0].toFixed(3), chroma: +Math.hypot(c[1], c[2]).toFixed(3) };
    })
    .filter((c) => c.share > 0)
    .sort((a, b) => b.share - a.share);
}

/** Immerkær (1996) noise sigma of a greyscale image: a texture / grain index. */
function grainSigma(img) {
  const { width: w, height: h, data, channels } = img;
  const g = (x, y) => { const i = (y * w + x) * channels; return channels === 1 ? data[i] : 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; };
  let sum = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++)
      sum += Math.abs(g(x - 1, y - 1) - 2 * g(x, y - 1) + g(x + 1, y - 1) - 2 * g(x - 1, y) + 4 * g(x, y) - 2 * g(x + 1, y) + g(x - 1, y + 1) - 2 * g(x, y + 1) + g(x + 1, y + 1));
  return Math.sqrt(Math.PI / 2) * sum / (6 * (w - 2) * (h - 2));
}

export async function reference(args) {
  const opts = options(args);
  const input = opts._[0];
  if (!input || !fs.existsSync(input)) throw new Error("usage: motion-kit reference <video> [--name n] [--every 0.5] [--rate 10]");
  const name = opts.name ?? path.parse(input).name;
  const every = Number(opts.every ?? 0.5);
  const rate = Number(opts.rate ?? 10);
  const dir = path.join("refs", name);
  const framesDir = path.join(dir, "frames");
  const scanDir = path.join("out", ".reference", name);
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.rmSync(scanDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  fs.mkdirSync(scanDir, { recursive: true });
  const info = probe(input);

  // Frames to study, and a dense low-resolution stream to measure cuts and motion.
  // Study frames by exact timestamp (fast seek per frame): `-r` pads the end with duplicates.
  const times = [];
  for (let t = 0; t < info.duration - 1 / info.fps; t += every) times.push(+t.toFixed(3));
  for (let i = 0; i < times.length; i += 20) {
    // One ffmpeg process per 20 frames: each frame is its own seeked input, mapped to its own file.
    const batch = times.slice(i, i + 20);
    const args = [...batch.flatMap((t) => ["-ss", String(t), "-i", path.resolve(input)])];
    batch.forEach((_, j) => args.push("-map", `${j}:v:0`, "-frames:v", "1", "-vf", "scale=640:-2", "-y", path.resolve(framesDir, `${String(i + j + 1).padStart(4, "0")}.png`)));
    ffmpeg(args);
  }
  // Every frame at its own rate, frame n at n / fps: resampling with `-r` drops and repeats frames
  // and put cuts 0.1–0.2 s late.
  ffmpeg(["-i", path.resolve(input), "-fps_mode", "passthrough", "-vf", "scale=64:36,format=gray", "-y", path.resolve(scanDir, "%05d.png")]);
  const frames = fs.readdirSync(framesDir).filter((f) => f.endsWith(".png")).sort();
  const scan = fs.readdirSync(scanDir).filter((f) => f.endsWith(".png")).sort().map((f) => readPng(path.join(scanDir, f)).data);
  const fps = info.fps;
  const meanDiff = (a, b) => a.reduce((s, v, j) => s + Math.abs(v - b[j]), 0) / a.length;

  // Cuts: a jump far above the frame's typical change and at least 4× the change on either side of
  // it, over one frame or two (motion blur can split a cut across one blended frame). Fast moves,
  // wipes, irises and dissolves change on the neighbouring frames too, so they are not cuts.
  const diff = scan.map((d, n) => (n ? meanDiff(d, scan[n - 1]) : 0));
  const sorted = diff.slice(1).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const threshold = Math.max(12, median * 6);
  const at = (n) => diff[n] ?? 0;
  const strength = (n) => {
    const one = at(n) > 4 * Math.max(at(n - 1), at(n + 1)) + 1 ? at(n) : 0;
    const span = n + 1 < scan.length ? meanDiff(scan[n + 1], scan[n - 1]) : 0;
    const split = Math.min(at(n), at(n + 1)) > span / 4;
    const two = split && span > 4 * Math.max(at(n - 1), at(n + 2)) + 1 ? span : 0;
    return Math.max(one, two);
  };
  const cuts = [];
  for (let n = 1; n < scan.length; n++) {
    if (strength(n) <= threshold) continue;
    const t = n / fps;
    if (!cuts.length || t - cuts.at(-1) > 0.25) cuts.push(+t.toFixed(3));
  }

  // Motion: difference across 1 / rate s (comparable between sources of any frame rate).
  const step = Math.max(1, Math.round(fps / rate));
  const motionAt = scan.map((d, n) => (n >= step ? meanDiff(d, scan[n - step]) : 0));
  const bounds = [0, ...cuts, +info.duration.toFixed(3)];
  const shots = bounds.slice(1).map((end, i) => {
    const start = bounds[i];
    // Skip the frames across each cut, which would count the cut as motion.
    const inside = motionAt.slice(Math.ceil(start * fps) + step, Math.floor(end * fps));
    const motion = inside.length ? inside.reduce((a, b) => a + b, 0) / inside.length : 0;
    return { start, end, length: +(end - start).toFixed(2), motion: +motion.toFixed(2), pace: motion < 2 ? "still" : motion < 6 ? "moving" : "fast" };
  });
  const lengths = shots.map((s) => s.length).sort((a, b) => a - b);

  // Palette, tone and grain from the study frames.
  const samples = [];
  let lumSum = 0, lumSq = 0, chromaSum = 0, count = 0, grain = 0;
  for (const f of frames) {
    const img = readPng(path.join(framesDir, f));
    grain += grainSigma(img);
    for (let i = 0; i < img.width * img.height; i += 37) {
      const p = i * img.channels;
      const rgb = img.channels === 1 ? [img.data[p], img.data[p], img.data[p]] : [img.data[p], img.data[p + 1], img.data[p + 2]];
      const lab = oklab(...rgb);
      samples.push({ rgb, lab });
      lumSum += lab[0]; lumSq += lab[0] ** 2; chromaSum += Math.hypot(lab[1], lab[2]); count++;
    }
  }
  const meanL = lumSum / count;
  const analysis = {
    source: input,
    duration: +info.duration.toFixed(2),
    size: `${info.width}×${info.height}`,
    fps: +info.fps.toFixed(3),
    audio: Boolean(info.audio),
    frames: { every, files: frames.map((f, i) => ({ file: `frames/${f}`, t: times[i] })) },
    cuts,
    shots,
    shotLength: { count: shots.length, median: lengths[Math.floor(lengths.length / 2)], min: lengths[0], max: lengths.at(-1), cutsPerMinute: +((cuts.length / info.duration) * 60).toFixed(1) },
    palette: palette(samples),
    tone: { meanLightness: +meanL.toFixed(3), contrast: +Math.sqrt(Math.max(0, lumSq / count - meanL ** 2)).toFixed(3), meanChroma: +(chromaSum / count).toFixed(3) },
    grain: { sigma: +(grain / frames.length).toFixed(2), note: "Immerkær noise sigma on 640-px frames, 0–255 scale; under ~1.5 is clean, over ~4 is visibly grainy" },
    method: { cutThreshold: +threshold.toFixed(1), scanFps: +fps.toFixed(3), motionRate: rate, medianDifference: +median.toFixed(2) },
  };
  fs.writeFileSync(path.join(dir, "analysis.json"), JSON.stringify(analysis, null, 2) + "\n");

  // One labelled contact image of the study frames.
  const cols = 6;
  const html = `<!doctype html><body style="margin:0;background:#222;font:600 13px ui-monospace,monospace;color:#fff">
  <div style="display:grid;grid-template-columns:repeat(${cols},320px);gap:6px;padding:6px">${frames
    .map((f, i) => {
      const t = times[i];
      const cut = cuts.some((c) => c > t - every && c <= t + 1e-6);
      return `<div style="position:relative;outline:${cut ? "3px solid #d97757" : "none"}"><img src="file://${path.resolve(framesDir, f)}" style="width:320px;display:block"><span style="position:absolute;left:4px;top:3px;background:rgba(0,0,0,.65);padding:0 5px">${t.toFixed(1)}s${cut ? " · cut" : ""}</span></div>`;
    })
    .join("")}</div></body>`;
  const htmlFile = path.resolve(scanDir, "contact.html");
  fs.writeFileSync(htmlFile, html);
  const browser = await chromium.launch({ executablePath: (await ensureBrowser()).path });
  const page = await browser.newPage({ viewport: { width: cols * 326 + 6, height: 100 } });
  await page.goto(`file://${htmlFile}`);
  await page.screenshot({ path: path.join(dir, "contact.png"), fullPage: true });
  await browser.close();

  console.log(`${dir}/  frames/ (${frames.length}, every ${every} s)  contact.png  analysis.json`);
  console.log(`  ${analysis.duration} s · ${shots.length} shots · median shot ${analysis.shotLength.median} s · ${analysis.shotLength.cutsPerMinute} cuts/min · grain σ ${analysis.grain.sigma}`);
  console.log(`  palette ${analysis.palette.slice(0, 6).map((c) => `${c.hex} ${(c.share * 100).toFixed(0)}%`).join("  ")}`);
}
