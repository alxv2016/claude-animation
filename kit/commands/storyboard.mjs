// motion-kit storyboard <film dir> [--cols 4] [--width 300] [--out file]
// The storyboard the user approves before any scene code (studio rule R20): one panel per shot from
// the film's storyboard.json — key frame from the real assets, copy, motion, camera, the join into
// the next shot and the sound — laid out as a board and photographed with Playwright → out/storyboard-<slug>.png.
import fs from "node:fs";
import path from "node:path";
import { ensureBrowser } from "@remotion/renderer";
import { chromium } from "playwright-core";
import { options } from "../lib/render-core.mjs";

const SIZES = { "16:9": [16, 9], "9:16": [9, 16], "1:1": [1, 1] };
const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export async function storyboard(args) {
  const opts = options(args);
  const dir = opts._[0];
  if (!dir) throw new Error("usage: motion-kit storyboard <film dir> [--cols 4] [--width 300] [--out file]");
  const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  if (!fs.existsSync(path.join(dir, "storyboard.json"))) throw new Error(`no ${path.join(dir, "storyboard.json")}: write the storyboard first (make-motion-film skill, references/storyboard.md)`);
  const board = read("storyboard.json");
  const film = fs.existsSync(path.join(dir, "film.json")) ? read("film.json") : { id: path.basename(path.resolve(dir)), title: board.title, formats: ["16:9"] };
  const grid = fs.existsSync(path.join(dir, "beats.json")) ? read("beats.json") : null;
  const time = (b) => (grid ? grid.offset + b * grid.period : null);

  const format = board.format ?? film.formats[0];
  const [aw, ah] = SIZES[format];
  const cols = Number(opts.cols ?? (format === "16:9" ? 3 : 4));
  const w = Number(opts.width ?? (format === "16:9" ? 420 : 300));
  const h = Math.round((w * ah) / aw);

  const panel = (shot, i) => {
    const [b0, b1] = shot.beats ?? [];
    const when = b0 === undefined ? "" : ` · b${b0}–${b1}${time(b0) === null ? "" : ` · ${time(b0).toFixed(2)}–${time(b1).toFixed(2)} s`}`;
    const src = shot.image ? path.resolve("public", shot.image) : null;
    if (src && !fs.existsSync(src)) throw new Error(`shot ${i + 1}: no image at ${src}`);
    const [fx, fy] = shot.focus ?? [0.5, 0.5];
    const image = src ? `<img src="file://${src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${shot.fit ?? "contain"};object-position:${fx * 100}% ${fy * 100}%;transform:scale(${shot.zoom ?? 1});transform-origin:${fx * 100}% ${fy * 100}%">` : "";
    const copy = shot.copy
      ? `<div style="position:absolute;left:7%;right:7%;${shot.copyAt === "bottom" ? "bottom:9%" : "top:9%"};font:700 ${Math.round(w * 0.085)}px/1.08 system-ui,sans-serif;letter-spacing:-0.02em;color:${shot.copyColor ?? "#111"};white-space:pre-line">${esc(shot.copy)}</div>`
      : "";
    const row = (label, text) => (text ? `<div style="margin-top:6px"><b style="color:#888;font-weight:600">${label}</b> ${esc(text)}</div>` : "");
    return `<div style="width:${w}px">
      <div style="font:700 13px ui-monospace,monospace;color:#eee;margin-bottom:6px">${i + 1} · ${esc(shot.chapter ?? "")}${when}</div>
      <div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${shot.ground ?? "#fff"};border-radius:4px">${image}${copy}</div>
      <div style="font:13px/1.35 system-ui,sans-serif;color:#ddd;margin-top:4px">
        ${row("Motion", shot.motion)}${row("Camera", shot.camera)}${row("Join →", shot.join)}${row("Sound", shot.sound)}
      </div></div>`;
  };

  const html = `<!doctype html><html><body style="margin:0;background:#1d1d1b;padding:24px">
  <div style="font:700 22px system-ui,sans-serif;color:#fff">${esc(board.title ?? film.title)} — storyboard · ${format}</div>
  ${board.logline ? `<div style="font:15px system-ui,sans-serif;color:#bbb;margin:6px 0 4px">${esc(board.logline)}</div>` : ""}
  <div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:28px 20px;margin-top:18px">${board.shots.map(panel).join("")}</div>
  </body></html>`;
  const work = path.resolve("out/.storyboard", film.id);
  fs.mkdirSync(work, { recursive: true });
  const htmlFile = path.join(work, "storyboard.html");
  fs.writeFileSync(htmlFile, html);
  const browser = await chromium.launch({ executablePath: (await ensureBrowser()).path });
  const page = await browser.newPage({ viewport: { width: cols * w + (cols - 1) * 20 + 48, height: 100 } });
  await page.goto(`file://${htmlFile}`);
  await page.waitForLoadState("networkidle");
  const out = opts.out ?? `out/storyboard-${film.id}.png`;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log(out);
}
