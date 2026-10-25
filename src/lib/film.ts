// A film's clock: beats from its measured beats.json (studio rule R14), chapters by beat.
// Scenes take the beat number `b` and stay pure functions of it (R1).

export type BeatGrid = { offset: number; period: number; beats: number[]; bpm?: number };
export type Chapter = { start: number; name: string; scene?: string };

export function beatClock(grid: BeatGrid, beatsPerBar = 4) {
  return {
    /** Beat number (fractional) at a time in seconds. */
    beatAt: (seconds: number) => (seconds - grid.offset) / grid.period,
    /** Time in seconds of a (fractional) beat. */
    timeAtBeat: (beat: number) => grid.offset + beat * grid.period,
    /** A duration in beats, in seconds — for springs, whose constants are in seconds and hertz. */
    sec: (beats: number) => beats * grid.period,
    /** Bar index (0-based) of a beat. */
    bar: (beat: number) => Math.floor(beat / beatsPerBar),
    beatsPerBar,
    period: grid.period,
  };
}

/** The chapter playing at beat `b`, its index, and beats since it started. */
export function chapterAt(chapters: readonly Chapter[], b: number) {
  let index = 0;
  for (let i = 0; i < chapters.length; i++) if (b >= chapters[i].start) index = i;
  return { chapter: chapters[index], index, local: b - chapters[index].start };
}
