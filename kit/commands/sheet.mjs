// motion-kit sheet <composition> [--frames a,b,c | --every n | --beats file.json [--offset 0.5] | --count n]
//                               [--cols 4] [--width 480] [--props '<json>'] [--out file]
// A contact sheet of any composition: thumbnails rendered with renderStill, laid out in a grid,
// photographed with Playwright. The review loop's main view (review-film skill).
import fs from "node:fs";
import path from "node:path";
import { ensureBrowser } from "@remotion/renderer";
import { chromium } from "playwright-core";
import { options, select, still } from "../lib/render-core.mjs";

export async function sheet(args) {
  const opts = options(args);
  const id = opts._[0];
  if (!id) throw new Error("usage: motion-kit sheet <composition> [--frames a,b | --every n | --beats file.json | --count n] [--cols 4] [--width 480]");
  const inputProps = opts.props ? JSON.parse(opts.props) : {};
  const { composition } = await select(id, inputProps);
  const { fps, durationInFrames, width, height } = composition;
  const last = durationInFrames - 1;

  let frames;
  let labels;
  if (opts.frames) frames = String(opts.frames).split(",").map(Number);
  else if (opts.every) frames = range(0, last, Number(opts.every));
  else if (opts.beats) {
    // One frame per beat of a measured grid: { beats: [seconds…] } or [seconds…].
    const grid = JSON.parse(fs.readFileSync(opts.beats, "utf8"));
    const beats = Array.isArray(grid) ? grid : grid.beats;
    // --offset shifts every sample by a fraction of a beat, to see motion between the hits.
    const offset = Number(opts.offset ?? 0);
    const gaps = beats.slice(1).map((b, i) => b - beats[i]).sort((a, b) => a - b);
    const period = gaps[Math.floor(gaps.length / 2)] ?? 0;
    frames = beats.map((s) => Math.min(last, Math.max(0, Math.round((s + offset * period) * fps))));
    labels = beats.map((_, i) => `beat ${offset ? (i + offset).toFixed(2) : i}`);
  } else {
    const count = Number(opts.count ?? 16);
    frames = Array.from({ length: count }, (_, i) => Math.round((i * last) / Math.max(1, count - 1)));
  }
  const keep = frames.map((f) => f >= 0 && f <= last);
  frames = frames.filter((_, i) => keep[i]);
  labels = labels?.filter((_, i) => keep[i]);

  const cols = Number(opts.cols ?? 4);
  const thumbW = Number(opts.width ?? (width >= height ? 480 : 270));
  const scale = thumbW / width;
  const dir = path.resolve("out/.sheet", id);
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const f of frames) {
    const file = path.join(dir, `${f}.jpg`);
    await still(id, f, { inputProps, out: file, scale, imageFormat: "jpeg" });
    files.push(file);
    process.stdout.write(`\r${files.length}/${frames.length} frames`);
  }
  process.stdout.write("\n");

  const gap = 16;
  const thumbH = Math.round(height * scale);
  const html = `<!doctype html><html><body style="margin:0;background:#2a2a28;font:600 15px ui-monospace,monospace">
  <div style="display:grid;grid-template-columns:repeat(${cols},${thumbW}px);gap:${gap}px;padding:${gap}px">
  ${files
    .map(
      (file, i) => `<div style="position:relative;width:${thumbW}px;height:${thumbH}px">
      <img src="file://${file}" style="width:100%;height:100%;display:block">
      <span style="position:absolute;left:6px;top:4px;padding:0 6px;color:#fff;background:rgba(0,0,0,.6)">${labels ? `${labels[i]} · ` : ""}f${frames[i]} · ${(frames[i] / fps).toFixed(2)}s</span></div>`,
    )
    .join("")}
  </div></body></html>`;
  const htmlFile = path.join(dir, "sheet.html");
  fs.writeFileSync(htmlFile, html);
  const browser = await chromium.launch({ executablePath: (await ensureBrowser()).path });
  const page = await browser.newPage({ viewport: { width: cols * thumbW + (cols + 1) * gap, height: 100 } });
  await page.goto(`file://${htmlFile}`);
  const out = opts.out ?? `out/sheet-${id}.png`;
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log(out);
}

const range = (a, b, step) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);
