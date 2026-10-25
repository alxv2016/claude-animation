import grid from "./beats.json";

export const FPS = 60;
export const W = 1920;
export const H = 1080;
export const DURATION_FRAMES = 900;

/** Measured beat grid (audio/beats.mjs). Fractional beats are fine. */
export const beatAt = (seconds: number) => (seconds - grid.offset) / grid.period;
export const timeAtBeat = (beat: number) => grid.offset + beat * grid.period;
/** Converts a duration in beats to seconds, for springs. */
export const sec = (beats: number) => beats * grid.period;
