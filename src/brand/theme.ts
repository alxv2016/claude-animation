import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { cubicBezier } from "../lib/math";

// Typed access to a captured brand's video theme (public/brands/<domain>/video-theme.json,
// written by brand/style-guide.mjs). See docs/BRAND_CAPTURE.md.

export type FontRole = { family: string | null; googleFont: string | null; files: { file: string; weight: string | null; style: string | null }[] };

export type VideoTheme = {
  domain: string;
  colors: { background: string; text: string; accent: string | null; neutrals: string[]; tokens: Record<string, string> };
  fonts: { display: FontRole; text: FontRole; mono: FontRole };
  type: { ui: number; body: number; h3: number; h2: number; h1: number; factor: number };
  easing: Record<string, number[]>; // cubic-bezier x1, y1, x2, y2
  durations: { value: string; ms: number; beats: number }[];
  radius: string[];
};

/** Registers a brand's captured font files with the renderer. Captured fonts may be licensed (see docs/BRAND_CAPTURE.md). */
export function loadBrandFonts(theme: VideoTheme) {
  const roles = [theme.fonts.display, theme.fonts.text, theme.fonts.mono];
  return Promise.all(
    roles.flatMap((role) =>
      role.family
        ? role.files.map((f) =>
            loadFont({
              family: role.family as string,
              url: staticFile(`brands/${theme.domain}/${f.file}`),
              weight: f.weight ?? undefined,
              style: f.style ?? undefined,
            }),
          )
        : [],
    ),
  );
}

/** A brand easing token (e.g. `--ease-out-quart`) as an easing function. */
export function brandEasing(theme: VideoTheme, name: string) {
  const points = theme.easing[name];
  if (points?.length !== 4) throw new Error(`No easing "${name}" in ${theme.domain}; have: ${Object.keys(theme.easing).join(", ")}`);
  const [x1, y1, x2, y2] = points;
  return cubicBezier(x1, y1, x2, y2);
}
