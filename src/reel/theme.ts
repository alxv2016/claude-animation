import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";

// One display face, one UI face, one accent.
export const DISPLAY = loadSerif("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] }).fontFamily;
loadSerif("italic", { weights: ["400"], subsets: ["latin"] });
export const UI = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const INK = "#141413";
export const IVORY = "#F0EEE6";
export const CLAY = "#D97757";

export const ivory = (alpha: number) => `rgba(240, 238, 230, ${alpha})`;
export const ink = (alpha: number) => `rgba(20, 20, 19, ${alpha})`;

/** Smallest UI text that still reads on a phone-width 16:9 frame. */
export const UI_SIZE = 56;
