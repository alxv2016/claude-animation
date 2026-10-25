import { useVideoConfig } from "remotion";

// One timeline, several formats: scenes lay out from the frame's size and safe area instead of
// fixed pixels, so the same film renders at 16:9, 9:16 and 1:1.

export const FORMATS = {
  "16:9": [1920, 1080],
  "9:16": [1080, 1920],
  "1:1": [1080, 1080],
} as const;
export type Format = keyof typeof FORMATS;

/**
 * Safe areas as fractions of width/height [left, top, right, bottom]. 16:9 uses broadcast
 * action-safe (5 %); 9:16 keeps clear of social-app overlays (caption and buttons at the
 * bottom, account bar at the top, action buttons on the right); 1:1 allows for feed crops.
 */
export const SAFE: Record<Format, readonly [number, number, number, number]> = {
  "16:9": [0.05, 0.05, 0.05, 0.05],
  "9:16": [0.06, 0.12, 0.14, 0.2],
  "1:1": [0.06, 0.06, 0.06, 0.06],
};

export function formatOf(width: number, height: number): Format {
  const r = width / height;
  return r > 1.2 ? "16:9" : r < 0.8 ? "9:16" : "1:1";
}

/** Frame size, format, safe rectangle (px) and a unit that scales type and spacing across formats. */
export function useLayout() {
  const { width, height } = useVideoConfig();
  const format = formatOf(width, height);
  const [l, t, r, b] = SAFE[format];
  const safe = { x: width * l, y: height * t, width: width * (1 - l - r), height: height * (1 - t - b) };
  // 1 unit = 1 px at 1080 px on the frame's short side: type set in units reads the same on every format.
  const unit = Math.min(width, height) / 1080;
  return { width, height, format, safe, unit, portrait: format === "9:16" };
}
