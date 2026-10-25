// Captures a website's brand into public/brands/<domain>/: design tokens, colours,
// fonts, type scale, motion tokens, component crops, logo and screenshots.
// node brand/capture.mjs <url> [--no-fonts]
// Output feeds brand/style-guide.mjs. Usage: the capture-brand skill; internals: docs/BRAND_CAPTURE.md.
import fs from "node:fs";
import path from "node:path";
import { ensureBrowser } from "@remotion/renderer";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
if (!url) {
  console.error("usage: node brand/capture.mjs <url> [--no-fonts]");
  process.exit(1);
}
const withFonts = !args.includes("--no-fonts");
const domain = new URL(url).hostname.replace(/^www\./, "");
const OUT = path.join("public", "brands", domain);
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const FULL_PAGE_MAX = 6000;
for (const dir of ["screenshots", "components", "fonts", "images"]) fs.mkdirSync(path.join(OUT, dir), { recursive: true });

// Remotion's headless Chrome: no separate Playwright browser download.
const browserStatus = await ensureBrowser();
const browser = await chromium.launch({ executablePath: browserStatus.path });
const context = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 2 });
const page = await context.newPage();
const fontResponses = new Map();
page.on("response", (r) => {
  if (r.request().resourceType() === "font" && r.ok()) fontResponses.set(r.url(), r);
});

const log = [];
const t0 = Date.now();
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => log.push(`goto: ${e.message.split("\n")[0]}`));
/** Clicks the first visible consent button so banners don't cover screenshots. */
async function dismissConsent(p, label) {
  for (const name of [/accept all/i, /^accept$/i, /^agree$/i, /allow all/i, /got it/i]) {
    const button = p.getByRole("button", { name }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => {});
      log.push(`${label}: dismissed consent button ${name}`);
      await p.waitForTimeout(600);
      return;
    }
  }
}
await dismissConsent(page, "desktop");
await page.evaluate(() => document.fonts.ready);

// Stylesheets the page cannot read (other origins) are fetched and parsed here instead.
const blockedSheets = await page.evaluate(() =>
  [...document.styleSheets].filter((s) => { try { void s.cssRules; return false; } catch { return !!s.href; } }).map((s) => s.href),
);
const externalCss = [];
for (const href of blockedSheets) {
  const res = await page.request.get(href).catch(() => null);
  if (res?.ok()) externalCss.push({ href, text: await res.text() });
}
log.push(`stylesheets fetched outside the page: ${externalCss.length} of ${blockedSheets.length}`);

const data = await page.evaluate(({ externalCss, viewport }) => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  /** Any CSS colour → { hex, alpha }, via the canvas so oklch() and color() normalize too. */
  const toColor = (value) => {
    if (!value || !CSS.supports("color", value)) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return null;
    return { hex: `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`, alpha: +(a / 255).toFixed(2) };
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0;
  };
  const tally = (map, key, w = 1) => { if (key) map.set(key, (map.get(key) ?? 0) + w); };
  const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, weight]) => ({ value, weight: Math.round(weight) }));
  const ROOT = /(^|,)\s*(:root|html)\b/;

  // Custom properties on :root/html and @font-face rules, from readable sheets and fetched ones.
  const varNames = new Set();
  const fontFaces = [];
  const keyframes = new Set();
  const walk = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules && !(rule instanceof CSSKeyframesRule)) walk(rule.cssRules);
      if (rule instanceof CSSKeyframesRule) keyframes.add(rule.name);
      if (rule instanceof CSSFontFaceRule) {
        const urls = [...rule.style.getPropertyValue("src").matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => new URL(m[1], rule.parentStyleSheet?.href ?? location.href).href);
        fontFaces.push({ family: rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim(), weight: rule.style.getPropertyValue("font-weight") || "400", style: rule.style.getPropertyValue("font-style") || "normal", urls });
      }
      if (rule.style && ROOT.test(rule.selectorText ?? "")) for (const prop of rule.style) if (prop.startsWith("--")) varNames.add(prop);
    }
  };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* fetched below */ } }
  for (const { href, text } of externalCss) {
    for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (ROOT.test(m[1])) for (const v of m[2].matchAll(/(--[\w-]+)\s*:/g)) varNames.add(v[1]);
    }
    for (const m of text.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
      const get = (p) => new RegExp(`${p}\\s*:\\s*([^;]+)`).exec(m[1])?.[1].trim();
      const urls = [...(get("src") ?? "").matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((u) => new URL(u[1], href).href);
      fontFaces.push({ family: (get("font-family") ?? "").replace(/["']/g, ""), weight: get("font-weight") ?? "400", style: get("font-style") ?? "normal", urls });
    }
    for (const m of text.matchAll(/@keyframes\s+([\w-]+)/g)) keyframes.add(m[1]);
  }
  const rootStyle = getComputedStyle(document.documentElement);
  const cssVars = Object.fromEntries([...varNames].sort().map((n) => [n, rootStyle.getPropertyValue(n).trim()]));
  const colorVars = Object.entries(cssVars).flatMap(([name, value]) => {
    const c = /^(#|rgb|hsl|oklch|oklab|lab|lch|color\()/i.test(value) ? toColor(value) : null;
    return c ? [{ name, ...c }] : [];
  });
  const easingVars = Object.entries(cssVars).filter(([, v]) => /cubic-bezier|linear\(|steps\(/.test(v)).map(([name, value]) => ({ name, value }));
  const durationVars = Object.entries(cssVars).filter(([, v]) => /^-?[\d.]+m?s$/.test(v)).map(([name, value]) => ({ name, value }));

  // Usage across visible elements: colours by area and by count, fonts by text length, shape and motion.
  const bgArea = new Map(), textLen = new Map(), usage = new Map(), interactive = new Map();
  const families = new Map(), radius = new Map(), shadow = new Map(), durations = new Map(), easings = new Map();
  const els = [...document.querySelectorAll("body *")].filter(visible).slice(0, 5000);
  for (const el of els) {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const isInteractive = el.matches("a, button, [role=button], input, select");
    const bg = toColor(s.backgroundColor);
    if (bg) { tally(bgArea, bg.hex, Math.min(r.width * r.height, viewport.width * viewport.height)); tally(usage, bg.hex); if (isInteractive) tally(interactive, bg.hex); }
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("");
    if (text) {
      const fg = toColor(s.color);
      if (fg) { tally(textLen, fg.hex, text.length); tally(usage, fg.hex); if (isInteractive) tally(interactive, fg.hex); }
      tally(families, s.fontFamily.split(",")[0].replace(/["']/g, "").trim(), text.length);
    }
    if (parseFloat(s.borderTopWidth) > 0) { const bc = toColor(s.borderTopColor); if (bc) tally(usage, bc.hex); }
    if (s.borderRadius !== "0px") tally(radius, s.borderRadius);
    if (s.boxShadow !== "none") tally(shadow, s.boxShadow);
    if (s.transitionDuration !== "0s") {
      s.transitionDuration.split(",").forEach((d) => tally(durations, d.trim()));
      s.transitionTimingFunction.split(/,(?![^(]*\))/).forEach((e) => tally(easings, e.trim()));
    }
    if (s.animationName !== "none") tally(durations, `animation ${s.animationName} ${s.animationDuration}`);
  }
  const pageBg = toColor(getComputedStyle(document.body).backgroundColor) ?? toColor(rootStyle.backgroundColor) ?? { hex: "#ffffff", alpha: 1 };
  tally(bgArea, pageBg.hex, viewport.width * viewport.height);

  const typeOf = (sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => visible(e) && e.textContent.trim());
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      sample: el.textContent.trim().replace(/\s+/g, " ").slice(0, 80),
      family: s.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      stack: s.fontFamily,
      size: parseFloat(s.fontSize),
      weight: s.fontWeight,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      transform: s.textTransform,
      color: toColor(s.color)?.hex ?? null,
    };
  };
  const typography = Object.fromEntries(
    [["h1", "h1"], ["h2", "h2"], ["h3", "h3"], ["body", "p"], ["small", "small, figcaption, .caption"], ["button", "button, [role=button]"], ["link", "a"], ["nav", "nav a, header a"], ["code", "code, pre, kbd"]]
      .map(([k, sel]) => [k, typeOf(sel)]),
  );

  const meta = (n) => document.querySelector(`meta[name="${n}"], meta[property="${n}"]`)?.content ?? null;
  return {
    meta: {
      title: document.title,
      description: meta("description"),
      ogImage: meta("og:image"),
      themeColor: meta("theme-color"),
      icons: [...document.querySelectorAll('link[rel*="icon"]')].map((l) => ({ rel: l.rel, href: l.href, sizes: l.sizes?.value || null })),
      headlines: [...document.querySelectorAll("h1, h2")].filter(visible).slice(0, 8).map((h) => h.textContent.trim().replace(/\s+/g, " ").slice(0, 120)),
    },
    cssVars,
    colorVars,
    easingVars,
    durationVars,
    keyframes: [...keyframes],
    fontFaces,
    loadedFonts: [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family.replace(/["']/g, "")}|${f.weight}|${f.style}`))],
    colors: { pageBackground: pageBg.hex, backgroundByArea: top(bgArea, 10), textByLength: top(textLen, 10), usageCount: top(usage, 40), interactive: top(interactive, 12) },
    fonts: { byTextLength: top(families, 6) },
    typography,
    radius: top(radius, 8),
    shadow: top(shadow, 6),
    motion: { durations: top(durations, 10), easings: top(easings, 8) },
  };
}, { externalCss, viewport: DESKTOP });

// --- colour analysis (OKLab chroma separates accents from neutrals) -------------
function oklab(hex) {
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L: +L.toFixed(3), C: +Math.hypot(A, B).toFixed(3) };
}
const ACCENT_NAME = /accent|brand|primary|highlight|cta|clay/i;
const candidates = new Map();
const bump = (hex, field, w) => {
  const c = candidates.get(hex) ?? { hex, ...oklab(hex), usage: 0, interactive: 0, namedBy: [] };
  c[field] += w;
  candidates.set(hex, c);
};
data.colors.usageCount.forEach(({ value, weight }) => bump(value, "usage", weight));
data.colors.interactive.forEach(({ value, weight }) => bump(value, "interactive", weight));
for (const v of data.colorVars) {
  const c = candidates.get(v.hex) ?? { hex: v.hex, ...oklab(v.hex), usage: 0, interactive: 0, namedBy: [] };
  c.namedBy.push(v.name);
  candidates.set(v.hex, c);
}
const scored = [...candidates.values()].map((c) => ({
  ...c,
  namedBy: c.namedBy.slice(0, 4),
  score: Math.round((c.usage + 3 * c.interactive + (c.namedBy.some((n) => ACCENT_NAME.test(n)) ? 25 : 0)) * Math.min(1, c.C / 0.08)),
}));
const accentCandidates = scored.filter((c) => c.C >= 0.06 && c.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
const neutrals = scored.filter((c) => c.C < 0.03 && c.usage > 0).sort((a, b) => b.L - a.L).slice(0, 10);

// --- screenshots, components, logo ------------------------------------------------
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: path.join(OUT, "screenshots/desktop-1440x900.png") });
const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
await page.screenshot({ path: path.join(OUT, "screenshots/full-page.png"), fullPage: true, clip: { x: 0, y: 0, width: DESKTOP.width, height: Math.min(fullHeight, FULL_PAGE_MAX) } });

const KINDS = {
  logo: { sel: 'header a[href="/"] svg, header a[href="/"] img, a[aria-label*="home" i] svg, [class*="logo" i] svg, [class*="logo" i] img', max: 1, fits: (b) => b.width < 400 && b.height < 160 },
  nav: { sel: "header, nav", max: 1, fits: (b) => b.height < 200 },
  button: { sel: 'button, a[class*="button" i], a[class*="btn" i], [role="button"]', max: 4, fits: (b) => b.width < 420 && b.height < 120 },
  card: { sel: '[class*="card" i], article', max: 3, fits: (b) => b.width >= 160 && b.width <= DESKTOP.width * 0.7 && b.height <= DESKTOP.height * 0.8 },
  badge: { sel: '[class*="badge" i], [class*="tag" i], [class*="pill" i], [class*="chip" i]', max: 3, fits: (b) => b.width < 300 && b.height < 60 },
  input: { sel: 'input[type="email"], input[type="text"], input[type="search"], textarea', max: 2, fits: (b) => b.width < 900 },
  footer: { sel: "footer", max: 1, fits: () => true },
};
const components = [];
let logoSvg = null;
for (const [kind, spec] of Object.entries(KINDS)) {
  const loc = page.locator(spec.sel);
  const count = Math.min(await loc.count(), 40);
  let taken = 0;
  for (let i = 0; i < count && taken < spec.max; i++) {
    const el = loc.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const box = await el.boundingBox();
    if (!box || box.width < 8 || box.height < 8 || !spec.fits(box)) continue;
    const file = `components/${kind}-${taken + 1}.png`;
    const ok = await el.screenshot({ path: path.join(OUT, file), timeout: 5000 }).then(() => true, () => false);
    if (!ok) continue;
    const style = await el.evaluate((e) => {
      const s = getComputedStyle(e);
      return { background: s.backgroundColor, color: s.color, radius: s.borderRadius, padding: s.padding, border: s.border, shadow: s.boxShadow, font: `${s.fontWeight} ${s.fontSize} ${s.fontFamily.split(",")[0]}`, text: e.textContent.trim().replace(/\s+/g, " ").slice(0, 60) };
    });
    if (kind === "logo") {
      logoSvg = await el.evaluate((e) => {
        if (e.tagName.toLowerCase() !== "svg") return null;
        const clone = e.cloneNode(true);
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("style", `color: ${getComputedStyle(e).color}`);
        return clone.outerHTML;
      });
      if (logoSvg) fs.writeFileSync(path.join(OUT, "logo.svg"), logoSvg);
    }
    components.push({ kind, file, box: { width: Math.round(box.width), height: Math.round(box.height) }, style });
    taken++;
  }
}

const mobileContext = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const mobile = await mobileContext.newPage();
await mobile.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => log.push(`mobile goto: ${e.message.split("\n")[0]}`));
await dismissConsent(mobile, "mobile");
await mobile.screenshot({ path: path.join(OUT, "screenshots/mobile-390x844.png") });

// --- downloads: fonts, icons, social image ----------------------------------------
const save = async (remote, dir) => {
  const res = await page.request.get(remote).catch(() => null);
  if (!res?.ok()) return null;
  const name = decodeURIComponent(new URL(remote).pathname.split("/").pop() || "file").replace(/[^\w.-]/g, "_");
  fs.writeFileSync(path.join(OUT, dir, name), await res.body());
  return `${dir}/${name}`;
};
const fontFiles = [];
if (withFonts) {
  for (const remote of fontResponses.keys()) {
    const file = await save(remote, "fonts");
    const face = data.fontFaces.find((f) => f.urls.includes(remote));
    if (file) fontFiles.push({ file, url: remote, family: face?.family ?? null, weight: face?.weight ?? null, style: face?.style ?? null });
  }
}
const images = [];
for (const icon of data.meta.icons) { const file = await save(icon.href, "images"); if (file) images.push({ role: icon.rel, file, sizes: icon.sizes }); }
if (data.meta.ogImage) { const file = await save(new URL(data.meta.ogImage, url).href, "images"); if (file) images.push({ role: "og:image", file }); }

const brand = {
  url,
  domain,
  capturedAt: new Date().toISOString(),
  capture: { seconds: +((Date.now() - t0) / 1000).toFixed(1), browser: `${browser.version()} (${browserStatus.type})`, playwright: "playwright-core", desktop: DESKTOP, mobile: MOBILE, log },
  meta: data.meta,
  palette: { pageBackground: data.colors.pageBackground, backgroundByArea: data.colors.backgroundByArea, textByLength: data.colors.textByLength, neutrals, accentCandidates },
  colorTokens: data.colorVars,
  typography: data.typography,
  fonts: { byTextLength: data.fonts.byTextLength, loaded: data.loadedFonts, faces: data.fontFaces.filter((f) => f.family), files: fontFiles, licence: "unknown — check before publishing" },
  motion: { easingTokens: data.easingVars, durationTokens: data.durationVars, usedDurations: data.motion.durations, usedEasings: data.motion.easings, keyframes: data.keyframes },
  shape: { radius: data.radius, shadow: data.shadow },
  components,
  logo: { svg: logoSvg ? "logo.svg" : null },
  images,
  screenshots: { desktop: "screenshots/desktop-1440x900.png", fullPage: "screenshots/full-page.png", mobile: "screenshots/mobile-390x844.png" },
  cssVars: data.cssVars,
};
fs.writeFileSync(path.join(OUT, "brand.json"), JSON.stringify(brand, null, 2) + "\n");
await browser.close();

console.log(`${OUT}/brand.json  ${brand.capture.seconds}s`);
console.log(`  tokens ${Object.keys(brand.cssVars).length} (colour ${brand.colorTokens.length}, easing ${brand.motion.easingTokens.length})`);
console.log(`  accent ${accentCandidates[0]?.hex ?? "none found"}  neutrals ${neutrals.length}  fonts ${fontFiles.length} files  components ${components.length}  logo ${logoSvg ? "svg" : "png only"}`);
for (const line of log) console.log(`  ${line}`);
