// __TITLE__ — sound: __BPM__ BPM, __BARS__ bars. Render with `npx motion-kit score src/films/__SLUG__`:
// public/__SLUG__/score.wav (−14 LUFS), cues.json (every cue's time) and beats.json.
// Sound effects only, one on each picture event in brief.md (score-and-beats skill). The kit never
// composes music (R13): if the user supplies a track, set `track` and the effects mix over it.
export default {
  bpm: __BPM__,
  bars: __BARS__,
  tail: 1, // seconds after the last bar for the last effect to ring out
  // track: "public/__SLUG__/music.mp3", // the user's music: beat(n) then follows its measured beats
  compose({ beat, click, tap, pop, thud, swoosh, swish, impact, riser, reverseCymbal }) {
    // A placeholder: replace with the plan's Sound column, each effect timed to its frame
    // (score-and-beats skill, references/instruments.md: "Sync to picture").
    reverseCymbal(beat(4), beat(1), 0.4);
    impact(beat(4), 0.8);
  },
};
