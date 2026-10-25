// motion-kit new-film <slug> [--title "…"] [--bpm 120] [--bars 8] [--fps 60] [--formats 16:9,9:16,1:1]
//                           [--chapters "Hook,Reveal,…"]
// Scaffolds src/films/<slug>/ from kit/templates/film and registers its compositions in src/Root.tsx.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { options } from "../lib/render-core.mjs";

const TEMPLATE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../templates/film");
const MARKER = "{/* motion-kit:films */}";
const FORMATS = ["16:9", "9:16", "1:1"];

export function newFilm(args) {
  const opts = options(args);
  const slug = opts._[0];
  if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug)) throw new Error('usage: motion-kit new-film <slug: lowercase, digits, "-"> [--bpm 120] [--bars 8] [--fps 60] [--formats 16:9,9:16]');
  const dir = path.join("src", "films", slug);
  if (fs.existsSync(dir) && !opts.force) throw new Error(`${dir} exists (--force to overwrite)`);
  const bpm = Number(opts.bpm ?? 120);
  const bars = Number(opts.bars ?? 8);
  const fps = Number(opts.fps ?? 60);
  const formats = String(opts.formats ?? "16:9").split(",").map((f) => f.trim());
  for (const f of formats) if (!FORMATS.includes(f)) throw new Error(`format ${f}: use ${FORMATS.join(", ")}`);
  const title = opts.title ?? slug;
  const tail = 1;
  const period = 60 / bpm;
  const duration = bars * 4 * period + tail;
  // The library lives in src/motion-kit/ in projects, in src/ in the kit repo itself.
  const kit = fs.existsSync("src/motion-kit/lib/film.ts") ? "../../motion-kit" : "../..";

  fs.mkdirSync(dir, { recursive: true });
  const fill = (text) => text.replaceAll("__KIT__", kit).replaceAll("__TITLE__", title).replaceAll("__SLUG__", slug).replaceAll("__BPM__", String(bpm)).replaceAll("__BARS__", String(bars));
  for (const file of fs.readdirSync(TEMPLATE)) fs.writeFileSync(path.join(dir, file), fill(fs.readFileSync(path.join(TEMPLATE, file), "utf8")));

  const write = (name, data) => fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + "\n");
  write("film.json", { id: slug, title, fps, bpm, bars, tail, formats, durationInFrames: Math.ceil(duration * fps), audio: null });
  // A planned grid until `motion-kit score` measures the real one.
  write("beats.json", { source: "planned", bpm, period: +period.toFixed(6), offset: 0, beats: Array.from({ length: bars * 4 }, (_, i) => +(i * period).toFixed(6)) });
  const names = opts.chapters ? String(opts.chapters).split(",").map((s) => s.trim()) : Array.from({ length: bars }, (_, i) => `Bar ${i + 1}`);
  const span = (bars * 4) / names.length;
  write("chapters.json", names.map((name, i) => ({ start: Math.round(i * span), name })));
  fs.writeFileSync(path.join(dir, "brief.md"), brief({ title, slug, bpm, bars, fps, formats, names, span, period }));

  register(slug);
  console.log(`${dir}/  Film.tsx score.mjs film.json beats.json chapters.json brief.md`);
  console.log(`registered in src/Root.tsx: ${formats.map((f, i) => (i === 0 ? slug : `${slug}-${f.replace(":", "x")}`)).join(", ")}`);
  console.log(`next: fill in brief.md and storyboard.json, npx motion-kit storyboard ${dir}, and get the user's approval (R20)`);
}

function register(slug) {
  const root = path.join("src", "Root.tsx");
  if (!fs.existsSync(root)) return console.warn("no src/Root.tsx: register the film's Compositions yourself");
  let s = fs.readFileSync(root, "utf8");
  const name = slug.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase()) + "Film";
  if (s.includes(`./films/${slug}/Film`)) return;
  const importLine = `import { Compositions as ${name} } from "./films/${slug}/Film";\n`;
  const lastImport = [...s.matchAll(/^import .*;$/gm)].at(-1);
  s = lastImport ? s.slice(0, lastImport.index + lastImport[0].length + 1) + importLine + s.slice(lastImport.index + lastImport[0].length + 1) : importLine + s;
  // Same indentation as the marker's line.
  if (s.includes(MARKER)) s = s.replace(new RegExp(`^([ \\t]*)${MARKER.replace(/[{}*/]/g, "\\$&")}`, "m"), (line, indent) => `${line}\n${indent}<${name} />`);
  else s = s.replace(/(\n\s*)<\/>\s*\n(\s*\);?\s*\n?\s*};?\s*)$/, `$1  <${name} />$1</>\n$2`);
  fs.writeFileSync(root, s);
}

function brief({ title, slug, bpm, bars, fps, formats, names, span, period }) {
  const rows = names.map((n, i) => {
    const b0 = Math.round(i * span);
    const b1 = Math.round((i + 1) * span);
    return `| ${i + 1} | ${n} | ${b0}–${b1} | ${(b0 * period).toFixed(2)}–${(b1 * period).toFixed(2)} s | | | | |`;
  });
  return `# ${title} — brief

The plan on the beat grid: what happens on every beat, approved by the user as a storyboard before
any scene code (make-motion-film skill, studio rule R20). ${bpm} BPM, ${bars} bars, ${fps} fps,
${formats.join(", ")}.

## Brief

- **The film in one line**: (what the viewer sees, and should feel at the end)
- **Type**: (showreel · story · intro · product film · UI motion · app UI glass)
- **Audience and goal**:
- **Style source**: (studio default · captured brand: docs/brands/<domain>/ · reference: docs/references/<name>/)
- **Inputs**: (URL, screenshots, data, copy)
- **Music**: (the user's track under public/, or "effects only" — the kit never composes music, R13)

## Beat plan

Something new on every beat or two (R12); every join a designed transition (R21); every impact a
picture hit (R22); every effect on a picture event (R13).

| # | Chapter | Beats | Time | On screen (every beat) | Technique | Join into the next | Sound (effect → picture event) |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## Copy

| Beat | Text |
| --- | --- |
|  |  |
`;
}
