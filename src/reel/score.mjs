// The reel's score: 128 BPM, 8 bars, 15 s (docs/MOTION_REEL.md §13).
// Rendered by `npx motion-kit score src/reel` → public/reel.wav, src/reel/beats.json, src/reel/cues.json.
export default {
  bpm: 128,
  duration: 15,
  beats: 32,
  output: "public/reel.wav",
  compose(s) {
    const { beat, midi, kick, clap, hat, pluck, chime, tick, bass, pad, impact, whoosh, reverseCymbal, riser } = s;
    // --- the score ---------------------------------------------------------------
    // Bars: 0 bounce, 1 type, 2 grid, 3 data, 4 cube, 5 easing, 6 build, 7 logo.

    const chords = [
      [57, 60, 64], [53, 57, 60, 64], [52, 55, 60, 64], [55, 59, 62, 66],
      [57, 60, 64, 67], [53, 57, 60, 64], [55, 60, 62, 67], [57, 64, 69, 71],
    ];
    const roots = [33, 29, 36, 31, 33, 29, 31, 33];

    // Bar 0: the ball. Soft kick on beats, one pluck per letter hit (eighths 0-5),
    // a floor thud on eighth 6, then a whoosh as the ball arcs into the "o".
    for (let b = 0; b < 4; b++) kick(beat(b), 0.55);
    const letterNotes = [69, 72, 74, 76, 79, 81];
    letterNotes.forEach((m, i) => pluck(beat(i * 0.5), midi(m), 0.5, -0.5 + i * 0.2));
    pad(0, beat(4), chords[0], 0.35, 900);
    whoosh(beat(3.1), beat(0.9), 0.5, 300, 5000);
    reverseCymbal(beat(4), beat(1), 0.35);

    // Bars 1-5: the groove.
    for (let b = 4; b < 24; b++) {
      kick(beat(b), b === 4 ? 1 : 0.9);
      if (b % 2 === 1) clap(beat(b), 0.55, b % 4 === 1 ? -0.1 : 0.1);
      hat(beat(b + 0.5), 0.35, b % 4 === 3, b % 2 ? 0.3 : -0.3);
      hat(beat(b + 0.25), 0.12, false, -0.2);
      hat(beat(b + 0.75), 0.12, false, 0.2);
    }
    impact(beat(4), 0.75);
    for (let bar = 1; bar < 6; bar++) {
      pad(beat(bar * 4), beat(4), chords[bar], 0.55, 1500 + bar * 150);
      for (let e = 0; e < 8; e++) bass(beat(bar * 4 + e * 0.5), beat(0.45), midi(roots[bar] + (e === 7 ? 12 : 0)), 0.55);
    }
    // Bar 1: rows snap on each beat; blinds whoosh out.
    for (let b = 4; b < 8; b++) tick(beat(b), 0.25, 1800 + (b - 4) * 200);
    whoosh(beat(7.2), beat(0.8), 0.45, 600, 6000, 0.6, -0.6);
    // Bar 2: a ripple per beat rings a chord tone.
    [76, 79, 84, 79].forEach((m, i) => chime(beat(8 + i), midi(m), 0.22, -0.3 + i * 0.2));
    // Bar 3: counter ticks in sixteenths, a chime when the line draws.
    for (let s = 0; s < 12; s++) tick(beat(12 + s * 0.25), 0.18, 2200 + s * 60, (s % 2 ? 0.25 : -0.25));
    chime(beat(14), midi(83), 0.25, 0.2);
    // Bar 4: each cube turn gets a swish into the beat.
    for (let b = 16; b < 20; b++) whoosh(beat(b - 0.3), beat(0.36), 0.35, 500, 3500, b % 2 ? 0.5 : -0.5, b % 2 ? -0.5 : 0.5);
    // Bar 5: arrival chimes when the easing dots land.
    chime(beat(22), midi(81), 0.25, -0.2);
    chime(beat(24) - 0.001, midi(88), 0.18, 0.2);

    // Bar 6: the build. Kick and clap roll accelerate, then drop out for the
    // final half-beat of anticipation before the impact.
    pad(beat(24), beat(3.5), chords[6], 0.5, 1200);
    for (let b = 24; b < 27.5; b++) kick(beat(b), 0.85);
    for (let e = 0; e < 4; e++) clap(beat(24 + e * 0.5), 0.3 + e * 0.04, e % 2 ? 0.2 : -0.2);
    for (let s = 0; s < 6; s++) clap(beat(26 + s * 0.25), 0.4 + s * 0.04, s % 2 ? 0.25 : -0.25);
    for (let e = 0; e < 7; e++) pluck(beat(24 + e * 0.5), midi(67 + e * 2), 0.32, e % 2 ? 0.4 : -0.4);
    for (let e = 0; e < 7; e++) bass(beat(24 + e * 0.5), beat(0.45), midi(roots[6]), 0.5);
    riser(beat(24), beat(3.5), 0.5);
    reverseCymbal(beat(28), beat(1.5), 0.45);

    // Bar 7: the logo lands.
    kick(beat(28), 1);
    impact(beat(28), 1);
    pad(beat(28), s.duration - beat(28), chords[7], 0.6, 2400);
    bass(beat(28), s.duration - beat(28) - 0.05, midi(roots[7]), 0.6);
    [81, 84, 88, 91, 93, 96].forEach((m, i) => pluck(beat(28 + i * 0.25), midi(m), 0.3, -0.5 + i * 0.2));
    chime(beat(29), midi(76), 0.3, 0);
    for (let s = 0; s < 8; s++) tick(beat(30 + s * 0.125), 0.12, 3000, (s % 2 ? 0.3 : -0.3));
    kick(beat(30), 0.5);
    chime(beat(31), midi(93), 0.28, 0.1);
  },
};
