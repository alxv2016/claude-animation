# Instruments, score module and beat grid

## Contents

- [Score module](#score-module)
- [Session](#session)
- [Instruments](#instruments)
- [Piano](#piano)
- [Mix and master](#mix-and-master)
- [Patterns](#patterns)
- [Outputs](#outputs)
- [Beat measurement](#beat-measurement)
- [Traps](#traps)

## Score module

`score.mjs` default-exports:

| Key                | Required | Default                                | Does                                                               |
| ------------------ | -------- | -------------------------------------- | ------------------------------------------------------------------ |
| `bpm`              | Yes      | —                                      | Tempo                                                              |
| `bars`             | Yes*     | —                                      | Length in bars (*or give `duration`)                               |
| `beatsPerBar`      | No       | `4`                                    |                                                                    |
| `tail`             | No       | `0`                                    | Seconds after the last bar for reverb and the last hit             |
| `duration`         | No       | `bars · beatsPerBar · 60 / bpm + tail` | Length in seconds                                                  |
| `beats`            | No       | Beats before the tail                  | How many beats `beats.json` lists                                  |
| `beatBand`         | No       | `"low"`                                | `"low"` (kick band, < 150 Hz) or `"full"` for music without a kick |
| `minBpm`, `maxBpm` | No       | `90`, `180`                            | Tempo search range for the measurement                             |
| `seed`             | No       | `1337`                                 | Seeds `rand()` and `noise()`                                       |
| `lufs`             | No       | `-14`                                  | Loudness target                                                    |
| `output`           | No       | `public/<folder>/score.wav`            | Where the WAV goes                                                 |
| `compose(s)`       | Yes      | —                                      | Places every cue; `s` is the session below                         |

## Session

| Member                                 | Gives                                                             |
| -------------------------------------- | ----------------------------------------------------------------- |
| `beat(n)`                              | Seconds of beat `n` (fractions allowed: `beat(4.5)` is the "and") |
| `midi(note)`                           | Frequency in Hz of a MIDI note (69 = A4 = 440 Hz)                 |
| `bpm`, `beatSeconds`, `duration`, `SR` | Tempo, seconds per beat, length, 48000                            |
| `rand()`, `noise()`                    | Seeded random in [0, 1) and [−1, 1)                               |

## Instruments

Times `t0` and lengths `len` in seconds; `g` is gain (about 0.3–1); `pan` −1 (left) to 1 (right).
Frequencies `f` in Hz (use `midi(n)`); `notes` are MIDI numbers.

| Call                                                               | Sound                                               | Use                                     |
| ------------------------------------------------------------------ | --------------------------------------------------- | --------------------------------------- |
| `kick(t0, g)`                                                      | Pitched-down sine with a click; ducks pads and bass | The pulse; the grid is measured from it |
| `clap(t0, g, pan = 0.1)`                                           | Three noise bursts and a tail                       | Backbeat (beats 2 and 4)                |
| `hat(t0, g, open = false, pan)`                                    | High-passed noise, 22 ms closed / 110 ms open       | Off-beats, sixteenth ghosts             |
| `pluck(t0, f, g, pan)`                                             | FM pluck, bright and short                          | Arpeggios; one note per element         |
| `chime(t0, f, g, pan)`                                             | Inharmonic FM bell, 0.8 s decay                     | Reveals, a number landing               |
| `tick(t0, g, f = 2600, pan)`                                       | 10 ms click                                         | UI clicks, typing, counters             |
| `bass(t0, len, f, g)`                                              | Sine with a 2nd harmonic, driven                    | Root notes, eighths                     |
| `pad(t0, len, notes, g, cutoff = 1600)`                            | Detuned saws, low-passed                            | Chords under a scene                    |
| `piano(t0, note, velocity = 0.7, len = 1, pan)`                    | Modelled acoustic piano ([below](#piano))           | Melody, chords, a piano score           |
| `impact(t0, g)`                                                    | Sub boom and crack                                  | Smash cuts, the drop, the logo          |
| `whoosh(t0, len, g, f0 = 400, f1 = 4000, pan0 = −0.6, pan1 = 0.6)` | Swept band-passed noise, panned across              | Moves, wipes, a cursor's travel         |
| `reverseCymbal(tEnd, len, g)`                                      | Noise swelling into `tEnd`, cut at the hit          | Into a scene change                     |
| `riser(t0, len, g)`                                                | Noise and a saw opening up over `len`               | Builds, 1–2 bars                        |

Every call is logged to `cues.json` with its time; `reverseCymbal` logs its start (`tEnd − len`).

## Piano

`piano(t0, note, velocity, len, pan)` models a struck string, with no samples:

- **Stiff-string partials**: up to 18 overtones, each slightly sharp (inharmonicity
  `B = 6e-5 · 2^((note − 48) / 12)`, more in the treble).
- **Struck at 1/8 of the string**, so the 8th partial is missing, as on a real piano.
- **Two strings per note**, each partial detuned by a fraction of a cent either way, so they beat slowly against each other.
- **Two-stage decay**: a fast initial drop, then a long aftersound (about 10 s low in the bass, a
  fraction of a second at the top).
- **Velocity** sets loudness and brightness; a felt-hammer thump on the attack; the damper cuts the
  note at `len`.
- **Pan** defaults to the keyboard position (bass left, treble right).

Writing for it: voice chords as a pianist would (close in the middle register, MIDI 48–72; bass
octaves below 48), roll chords by 5–15 ms per note, vary velocity 0.4–0.8, and leave room for the
aftersound — piano scores breathe at 70–100 BPM. For a piano-only score set `beatBand: "full"`: there
is no kick to measure from.

## Mix and master

- **Sidechain**: pads and bass duck 65 % on every kick (4 ms attack, 130 ms release).
- **Reverb**: a Schroeder hall; each instrument has its own send.
- **Master**: 28 Hz high-pass, a 0.25 s fade at the end, loudness to −14 LUFS (ITU-R BS.1770) with a
  look-ahead limiter at −1.5 dBFS, 16-bit WAV with dither.

## Patterns

```js
// One chord per bar, a groove, and hits on scene changes (scene changes on beats 8 and 16).
compose({ beat, midi, kick, clap, hat, bass, pad, piano, whoosh, impact, reverseCymbal }) {
  const chords = [[57, 60, 64], [53, 57, 60, 64], [52, 55, 60, 64], [55, 59, 62]]; // Am Fmaj7 C/E G
  const roots = [33, 29, 36, 31];
  for (let bar = 0; bar < 8; bar++) {
    pad(beat(bar * 4), beat(4), chords[bar % 4], 0.3);
    for (let e = 0; e < 8; e++) bass(beat(bar * 4 + e / 2), beat(0.45), midi(roots[bar % 4]), 0.45);
    for (let b = 0; b < 4; b++) {
      kick(beat(bar * 4 + b), 0.85);
      hat(beat(bar * 4 + b + 0.5), 0.3);
      if (b % 2) clap(beat(bar * 4 + b), 0.5);
    }
  }
  for (const b of [8, 16]) { reverseCymbal(beat(b), beat(1), 0.5); impact(beat(b), 0.8); }
}
```

| Moment                 | Cue                                                               |
| ---------------------- | ----------------------------------------------------------------- |
| Scene change           | `impact` or `kick` 1.0; `reverseCymbal` into it                   |
| Element enters         | `pluck` per element, rising pitch along a stagger                 |
| Number lands, reveal   | `chime`                                                           |
| Cursor click, key type | `tick`                                                            |
| Camera move, wipe      | `whoosh` across the move's length                                 |
| Build                  | `riser` over 1–2 bars, then half a beat of silence, then `impact` |

## Outputs

| File                      | Holds                                                             |
| ------------------------- | ----------------------------------------------------------------- |
| `public/<slug>/score.wav` | 48 kHz stereo, −14 LUFS                                           |
| `cues.json`               | `{ bpm, duration, events: [{ type, t, args }] }`, `t` in seconds  |
| `beats.json`              | `{ bpm, period, offset, beats, detectedBeats, maxResidualMs, … }` |
| `film.json`               | `audio` and `durationInFrames` updated                            |

## Beat measurement

`beats` and `score` measure the grid from the audio: an onset-strength curve (low band: the kick under
150 Hz; full band: everything above 40 Hz), a grid search over tempo and phase within `minBpm`–`maxBpm`,
each beat snapped to its nearest strong onset within ±30 ms, a least-squares line fitted through them,
and beats more than 8 ms off the line dropped and the line refitted. `detectedBeats` lists the beats
that survived; `maxResidualMs` is the worst of them.

## Traps

| Symptom                                    | Cause                                             | Fix                                                      |
| ------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------- |
| Tempo measured as double or half           | The search range admits the eighth-note grid      | Narrow `minBpm`/`maxBpm` around the real tempo           |
| Few beats detected in a piano or pad score | No kick in the low band                           | `beatBand: "full"`                                       |
| Score louder or quieter than −14 after AAC | AAC shifts loudness by a few tenths               | Normal; `verify` allows ±1 LU                            |
| Piano notes sound hollow or thin           | Notes too high or too short for their aftersound  | Voice in MIDI 48–72; `len` ≥ 1 beat for sustained chords |
| Film and WAV lengths differ                | `score` not rerun after changing `bars` or `tail` | Rerun `npx motion-kit score`                             |
