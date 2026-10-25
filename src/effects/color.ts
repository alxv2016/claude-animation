// Colour conversion for shader uniforms. Gradients are mixed in OKLab so blends
// stay vivid and even (no muddy midpoints); shaders convert back to sRGB.

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** `#rgb` / `#rrggbb` → linear sRGB, 0–1. */
export function hexToLinear(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => toLinear(parseInt(full.slice(i, i + 2), 16) / 255)) as [number, number, number];
}

/** `#rgb` / `#rrggbb` → gamma-encoded sRGB, 0–1 (for values used directly as output colour). */
export function hexToSrgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/** `#rrggbb` → OKLab (L, a, b). */
export function hexToOklab(hex: string): [number, number, number] {
  const [r, g, b] = hexToLinear(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Packs up to `max` colours into a flat vec3 array, padding with the last colour. */
export function packColors(colors: string[], convert: (hex: string) => [number, number, number], max: number) {
  const list = colors.slice(0, max);
  while (list.length < max) list.push(list[list.length - 1] ?? "#000000");
  return { v3: list.flatMap(convert), count: Math.min(colors.length, max) };
}
