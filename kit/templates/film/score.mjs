// __TITLE__ — score: __BPM__ BPM, __BARS__ bars. Render with `npx motion-kit score src/films/__SLUG__`:
// public/__SLUG__/score.wav (−14 LUFS), cues.json (every cue's time) and the measured beats.json.
// A starter groove; replace it with the film's music (score-and-beats skill, references/instruments.md).
export default {
  bpm: __BPM__,
  bars: __BARS__,
  tail: 1, // seconds after the last bar for reverb and the final hit to ring out
  compose({ beat, midi, kick, hat, clap, bass, pad, piano, impact }) {
    const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55, 60], [55, 59, 62]]; // Am F C G
    const roots = [33, 29, 36, 31];
    for (let bar = 0; bar < __BARS__; bar++) {
      const c = chords[bar % 4];
      c.forEach((n, i) => piano(beat(bar * 4) + i * 0.01, n, 0.45, beat(3.8)));
      pad(beat(bar * 4), beat(4), c, 0.25, 1200);
      for (let e = 0; e < 8; e++) bass(beat(bar * 4 + e * 0.5), beat(0.45), midi(roots[bar % 4]), 0.45);
      for (let b = 0; b < 4; b++) {
        kick(beat(bar * 4 + b), 0.85);
        hat(beat(bar * 4 + b + 0.5), 0.3, false, b % 2 ? 0.3 : -0.3);
        if (b % 2) clap(beat(bar * 4 + b), 0.45);
      }
    }
    impact(0, 0.6);
  },
};
