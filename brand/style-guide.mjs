// Turns a captured brand into a video theme and a style guide:
//   public/brands/<domain>/brand.json (+ overrides.json)
//     → public/brands/<domain>/video-theme.json
//     → docs/brands/<domain>/STYLE_GUIDE.md (text between curated: markers is kept)
// node brand/style-guide.mjs <domain>
import fs from "node:fs";
import path from "node:path";

const domain = process.argv[2]?.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
if (!domain) {
  console.error("usage: node brand/style-guide.mjs <domain>");
  process.exit(1);
}
const BRAND_DIR = path.join("public", "brands", domain);
const DOC_DIR = path.join("docs", "brands", domain);
const DOC = path.join(DOC_DIR, "STYLE_GUIDE.md");
if (!fs.existsSync(path.join(BRAND_DIR, "brand.json"))) {
  console.error(`missing ${BRAND_DIR}/brand.json: run npm run brand:capture -- <url>`);
  process.exit(1);
}
const brand = JSON.parse(fs.readFileSync(path.join(BRAND_DIR, "brand.json"), "utf8"));
const overridesPath = path.join(BRAND_DIR, "overrides.json");
const overrides = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, "utf8")) : {};

const UI_MIN = 56; // px at 1920×1080; the smallest UI text that reads on a phone (MOTION_REEL.md §1)
const bpm = overrides.bpm ?? 128;
const beatSeconds = 60 / bpm;

// --- video theme ----------------------------------------------------------------
const KEYWORD_EASINGS = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], "ease-in": [0.42, 0, 1, 1], "ease-out": [0, 0, 0.58, 1], "ease-in-out": [0.42, 0, 0.58, 1] };
const parseEasing = (v) => {
  const m = /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(v);
  return m ? m.slice(1).map(Number) : KEYWORD_EASINGS[v.trim()] ?? null;
};
const toMs = (v) => (/ms$/.test(v) ? parseFloat(v) : parseFloat(v) * 1000);

const sameFamily = (a, b) => a && b && a.toLowerCase().replace(/[\s_-]/g, "") === b.toLowerCase().replace(/[\s_-]/g, "");
const googleFont = (family) => {
  if (!family) return null;
  const name = family.replace(/\bvariable\b/i, "").trim().split(/[\s-]+/).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  return fs.existsSync(path.join("node_modules", "@remotion", "google-fonts", "dist", "cjs", `${name}.js`)) ? name : null;
};
const role = (family) => ({
  family: family ?? null,
  googleFont: googleFont(family),
  files: brand.fonts.files.filter((f) => sameFamily(f.family, family)).map(({ file, weight, style }) => ({ file, weight, style })),
});
const t = brand.typography;
const monoFamily =
  overrides.fonts?.mono ??
  t.code?.family ??
  [...brand.fonts.byTextLength.map((f) => f.value), ...brand.fonts.faces.map((f) => f.family)].find((f) => /mono|code/i.test(f)) ??
  null;
const bodySize = t.body?.size ?? 16;
const factor = UI_MIN / Math.max(12, bodySize);
const scaled = (k, fallback) => Math.round((t[k]?.size ?? fallback) * factor);

const easing = {};
for (const { name, value } of brand.motion.easingTokens) {
  const p = parseEasing(value);
  if (p) easing[name] = p;
}
for (const { value } of brand.motion.usedEasings) {
  const p = parseEasing(value);
  if (p && !Object.values(easing).some((q) => q.join() === p.join())) easing[`used: ${value}`] = p;
}
const durations = brand.motion.usedDurations
  .filter((d) => !d.value.startsWith("animation"))
  .map((d) => ({ value: d.value, ms: Math.round(toMs(d.value)), beats: +(toMs(d.value) / 1000 / beatSeconds).toFixed(2), used: d.weight }));

const accent = overrides.accent ?? brand.palette.accentCandidates[0]?.hex ?? null;
const theme = {
  domain,
  generatedFrom: ["brand.json", ...(Object.keys(overrides).length ? ["overrides.json"] : [])],
  capturedAt: brand.capturedAt,
  colors: {
    background: overrides.background ?? brand.palette.pageBackground,
    text: overrides.text ?? brand.palette.textByLength[0]?.value ?? null,
    accent,
    neutrals: brand.palette.neutrals.map((n) => n.hex),
    tokens: Object.fromEntries(brand.colorTokens.filter((c) => c.alpha === 1).map((c) => [c.name, c.hex])),
  },
  fonts: { display: role(overrides.fonts?.display ?? t.h1?.family), text: role(overrides.fonts?.text ?? t.body?.family), mono: role(monoFamily) },
  type: { factor: +factor.toFixed(3), ui: UI_MIN, body: scaled("body", 16), h3: scaled("h3", 20), h2: scaled("h2", 28), h1: scaled("h1", 40) },
  easing,
  durations: durations.map(({ value, ms, beats }) => ({ value, ms, beats })),
  radius: brand.shape.radius.map((r) => r.value),
};
fs.writeFileSync(path.join(BRAND_DIR, "video-theme.json"), JSON.stringify(theme, null, 2) + "\n");

// --- style guide ----------------------------------------------------------------
const existing = fs.existsSync(DOC) ? fs.readFileSync(DOC, "utf8") : "";
const curated = Object.fromEntries([...existing.matchAll(/<!-- curated:(\w+) -->\n([\s\S]*?)<!-- \/curated:\1 -->/g)].map((m) => [m[1], m[2].trim()]));
const CURATED = { rules: "Video rules", voice: "Voice and copy", animate: "Components to animate" };
const heading = (key) => `${CURATED[key]}${curated[key] ? "" : " — NOT CURATED"}`;
const curatedBlock = (key, purpose) =>
  [
    curated[key] ? "" : `> **STATUS: NOT CURATED.** ${purpose} Written in the review pass ([BRAND_CAPTURE.md §6](../../BRAND_CAPTURE.md#6-review-pass)).\n`,
    `<!-- curated:${key} -->`,
    curated[key] ?? "",
    `<!-- /curated:${key} -->`,
  ].filter((l, i) => i !== 0 || l).join("\n");

const rel = (file) => `../../../public/brands/${domain}/${file}`;
const name = overrides.name ?? domain.split(".")[0].replace(/^./, (c) => c.toUpperCase());
const date = brand.capturedAt.slice(0, 10);
const row = (cells) => `| ${cells.map((c) => String(c ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ")} |`;
const table = (head, rows) => [row(head), row(head.map(() => "---")), ...rows.map(row)].join("\n");
const code = (v) => (v == null || v === "" ? "—" : `\`${v}\``);
const fontRow = (label, r) => [
  label,
  code(r.family),
  r.files.length ? r.files.map((f) => `${f.weight ?? "?"} ${f.style ?? ""}`.trim()).join(", ") : "none captured",
  r.googleFont ? `\`@remotion/google-fonts/${r.googleFont}\`` : "not on Google Fonts",
];

const accentSource = overrides.accent ? "`[curated]` `overrides.json`" : brand.palette.accentCandidates.length ? "`[derived]` top candidate (§2.2) — confirm in the review pass" : "none found";
const sections = [
  ["Video rules", heading("rules"), "What films for this brand must and must not do"],
  ["Palette", "Palette", "Colour roles, accent candidates, neutrals, colour tokens"],
  ["Typography", "Typography", "Faces and files, web type scale, video type scale"],
  ["Motion", "Motion", "Easing tokens as cubic-bezier, durations in beats, keyframes"],
  ["Shape", "Shape", "Corner radii and shadows"],
  ["Components", "Components", "Captured component crops and their styles"],
  ["Logo, imagery and copy", "Logo, imagery and copy", "Logo, icons, social image, screenshots, headlines"],
  ["Voice and copy", heading("voice"), "How on-screen copy should sound"],
  ["Components to animate", heading("animate"), "Which components and states to use in films"],
  ["Remotion theme", "Remotion theme", "Loading the theme, fonts and easing in a scene"],
  ["Capture details", "Capture details", "URL, date, browser, what the capture could not see"],
];
const slug = (h) => h.toLowerCase().replace(/[^\w\- ]/g, "").replace(/ /g, "-");

const md = `# ${name} Video Style Guide

How ${name}'s brand translates to video in this repo: palette, type, motion, shape, components and
imagery, captured from <${brand.url}> on ${date}. Read it before making a film for this brand.

Source of truth: [\`brand.json\`](${rel("brand.json")}) (captured), [\`overrides.json\`](${rel("overrides.json")})
(curated choices) and the generated [\`video-theme.json\`](${rel("video-theme.json")}). This file is
regenerated by \`npm run brand:guide -- ${domain}\`; edit only between \`curated:\` markers — everything
else is overwritten. Related: [BRAND_CAPTURE.md](../../BRAND_CAPTURE.md) — how capture and generation
work; [MOTION_REEL.md](../../MOTION_REEL.md) — motion techniques, and the studio rules every film follows
([§22](../../MOTION_REEL.md#22-brief-persona-and-studio-rules)).

| Tag          | Meaning                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| \`[captured]\` | Read from the live site by \`brand/capture.mjs\`                          |
| \`[derived]\`  | Computed from captured values by \`brand/style-guide.mjs\`                |
| \`[curated]\`  | Chosen in the review pass and recorded in \`overrides.json\` or a curated section |

${table(["§", "Section", "Look here for"], sections.map(([, h, look], i) => [i + 1, `[${h}](#${i + 1}-${slug(h)})`, look]))}

---

## 1. ${heading("rules")}

${curatedBlock("rules", "Do and Never for this brand in motion, each with its reason.")}

---

## 2. Palette

Colour roles for video, from what the site paints and the tokens it declares.

### 2.1 Roles

${table(["Role", "Colour", "Source"], [
  ["Background", code(theme.colors.background), overrides.background ? "`[curated]`" : "`[captured]` page background"],
  ["Text", code(theme.colors.text), overrides.text ? "`[curated]`" : "`[captured]` most text by length"],
  ["Accent", code(accent), accentSource],
])}

### 2.2 Accent candidates

Saturated colours (OKLab chroma ≥ 0.06), scored by use, use on links and buttons (× 3) and accent-like
token names (+ 25). \`[derived]\`

${brand.palette.accentCandidates.length ? table(["Colour", "Lightness", "Chroma", "Elements", "Interactive", "Named by", "Score"], brand.palette.accentCandidates.map((c) => [code(c.hex), c.L, c.C, c.usage, c.interactive, c.namedBy.map(code).join(" "), c.score])) : "No saturated colour is used on the page."}

### 2.3 Neutrals

Low-chroma colours in use, light to dark. \`[captured]\`

${table(["Colour", "Lightness", "Elements"], brand.palette.neutrals.map((n) => [code(n.hex), n.L, n.usage]))}

### 2.4 Colour tokens

Opaque colour custom properties declared on \`:root\` (${brand.colorTokens.length} total; first 40 shown, all in \`brand.json\`). \`[captured]\`

${table(["Token", "Colour"], brand.colorTokens.filter((c) => c.alpha === 1).slice(0, 40).map((c) => [code(c.name), code(c.hex)]))}

---

## 3. Typography

### 3.1 Faces

${table(["Role", "Family", "Files captured (weight style)", "Google Fonts"], [fontRow("Display", theme.fonts.display), fontRow("Text", theme.fonts.text), fontRow("Mono", theme.fonts.mono)])}

- **Captured font files may be licensed to ${domain} only.** They are saved for internal comps and are
  git-ignored; a published film needs a licence or a substitute recorded in \`overrides.json\`.

### 3.2 Web type scale \`[captured]\`

${table(["Element", "Family", "Size", "Weight", "Line height", "Letter spacing", "Sample"], Object.entries(t).filter(([, v]) => v).map(([k, v]) => [k, code(v.family), `${Math.round(v.size * 10) / 10} px`, v.weight, v.lineHeight, v.letterSpacing, v.sample.slice(0, 40)]))}

### 3.3 Video type scale \`[derived]\`

Web sizes × ${theme.type.factor} so body text lands on the ${UI_MIN} px phone-readable minimum at
1920 × 1080; ratios between levels match the site. Display type for kinetic moments goes larger
(160–520 px in [MOTION_REEL.md §15](../../MOTION_REEL.md#15-look-and-typography)).

${table(["Level", "Video size"], [["UI / captions (minimum)", `${theme.type.ui} px`], ["Body", `${theme.type.body} px`], ["H3", `${theme.type.h3} px`], ["H2", `${theme.type.h2} px`], ["H1", `${theme.type.h1} px`]])}

---

## 4. Motion

### 4.1 Easing tokens

Declared easing tokens and the curves the site uses, as \`cubic-bezier\` control points; use them in a
scene with \`brandEasing(theme, name)\` (§10). \`[captured]\`

${Object.keys(easing).length ? table(["Name", "x1, y1, x2, y2"], Object.entries(easing).map(([k, v]) => [code(k), v.join(", ")])) : "The site declares no easing tokens and uses no named curves."}

### 4.2 Durations

Transition durations in use, converted to beats at ${bpm} BPM (${beatSeconds.toFixed(4)} s per beat).
Web durations are UI micro-interactions; in film they suit small reactions, not scene moves. \`[derived]\`

${durations.length ? table(["Duration", "ms", "Beats", "Elements"], durations.map((d) => [code(d.value), d.ms, d.beats, d.used])) : "No transitions in use."}

### 4.3 Keyframes

${brand.motion.keyframes.length ? `${brand.motion.keyframes.length} \`@keyframes\` declared: ${brand.motion.keyframes.slice(0, 30).map(code).join(", ")}. \`[captured]\`` : "No `@keyframes` declared."}

---

## 5. Shape

${table(["Corner radius", "Elements"], brand.shape.radius.map((r) => [code(r.value), r.weight]))}

${brand.shape.shadow.length ? table(["Shadow", "Elements"], brand.shape.shadow.map((s) => [code(s.value), s.weight])) : "No box shadows in use."}

---

## 6. Components

First visible matches per kind at 1440 × 900, 2 × scale. \`[captured]\`

${brand.components.map((c) => `### 6.${brand.components.indexOf(c) + 1} ${c.kind} ${c.file.match(/-(\d+)\./)?.[1] ?? ""} — ${c.box.width} × ${c.box.height} px

![${c.kind}](${rel(c.file)})

${table(["Background", "Text", "Radius", "Padding", "Font"], [[code(c.style.background), code(c.style.color), code(c.style.radius), code(c.style.padding), code(c.style.font)]])}`).join("\n\n")}

---

## 7. Logo, imagery and copy

${brand.logo.svg ? `Logo (SVG, inherits \`color\`): [\`logo.svg\`](${rel("logo.svg")})\n\n![logo](${rel("logo.svg")})` : "No SVG logo found; see the `logo` component crop in §6."}

${table(["Image", "File"], [...brand.images.map((i) => [i.role + (i.sizes ? ` ${i.sizes}` : ""), `[\`${i.file}\`](${rel(i.file)})`]), ["Desktop 1440 × 900", `[\`${brand.screenshots.desktop}\`](${rel(brand.screenshots.desktop)})`], ["Mobile 390 × 844", `[\`${brand.screenshots.mobile}\`](${rel(brand.screenshots.mobile)})`], ["Full page", `[\`${brand.screenshots.fullPage}\`](${rel(brand.screenshots.fullPage)})`]])}

![desktop](${rel(brand.screenshots.desktop)})

${table(["Copy", "Text"], [["Title", brand.meta.title], ["Description", brand.meta.description], ...brand.meta.headlines.map((h, i) => [`Headline ${i + 1}`, h])])}

---

## 8. ${heading("voice")}

${curatedBlock("voice", "How on-screen copy should sound, from the site's headlines (§7) and tone.")}

---

## 9. ${heading("animate")}

${curatedBlock("animate", "Which captured components and states (§6) a film should animate, and how.")}

---

## 10. Remotion theme

\`video-theme.json\` holds the derived values above for scenes to import.

\`\`\`tsx
import theme from "../../public/brands/${domain}/video-theme.json";
import { brandEasing, loadBrandFonts, type VideoTheme } from "../brand/theme";

const brand = theme as VideoTheme;
loadBrandFonts(brand); // captured files; licence first (§3.1)
const ease = brandEasing(brand, "${Object.keys(easing)[0] ?? "--ease-out"}");
// brand.colors.accent, brand.type.h1, brand.durations[0].beats …
\`\`\`

Where it lives: [\`src/brand/theme.ts\`](../../../src/brand/theme.ts) — \`VideoTheme\`, \`loadBrandFonts\`, \`brandEasing\`.

---

## 11. Capture details

${table(["Item", "Value"], [
  ["URL", brand.url],
  ["Captured", brand.capturedAt],
  ["Browser", brand.capture.browser],
  ["Viewports", `${brand.capture.desktop.width} × ${brand.capture.desktop.height} @2x, ${brand.capture.mobile.width} × ${brand.capture.mobile.height} @3x`],
  ["Duration", `${brand.capture.seconds} s`],
  ["Tokens", `${Object.keys(brand.cssVars).length} custom properties, ${brand.colorTokens.length} colours, ${brand.motion.easingTokens.length} easings`],
  ["Font files", brand.fonts.files.length],
  ["Notes", brand.capture.log.join("; ") || "—"],
])}

- **The capture sees the home page's first state only**: no hover, scroll-triggered or JavaScript-driven
  animation, no pages behind login.
`;

fs.mkdirSync(DOC_DIR, { recursive: true });
fs.writeFileSync(DOC, md);
const missing = Object.keys(CURATED).filter((k) => !curated[k]);
console.log(`${DOC}\n${BRAND_DIR}/video-theme.json`);
console.log(`accent ${accent ?? "none"} (${overrides.accent ? "curated" : "derived"})  type ×${theme.type.factor}  easings ${Object.keys(easing).length}`);
if (missing.length) console.log(`not curated yet: ${missing.join(", ")} — see docs/BRAND_CAPTURE.md §6`);
