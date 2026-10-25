# Effects, score module and beat grid

## Contents

- [Score module](#score-module)
- [Session](#session)
- [Effects](#effects)
- [Sync to picture](#sync-to-picture)
- [Mix and master](#mix-and-master)
- [Outputs](#outputs)
- [Beat measurement](#beat-measurement)
- [Traps](#traps)

## Score module

`score.mjs` default-exports:

| Key                | Required | Default                                            | Does                                                                                    |
| ------------------ | -------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `bpm`              | Yes\*    | —                                                  | Tempo of the planned grid (\*measured from `track` when there is one)                   |
| `bars`             | Yes\*    | —                                                  | Length in bars (\*or give `duration`)                                                   |
| `beatsPerBar`      | No       | `4`                                                |                                                                                         |
| `tail`             | No       | `0`                                                | Seconds after the last bar for the last effect to ring out                              |
| `duration`         | No       | track offset + `bars · beatsPerBar` beats + `tail` | Length in seconds                                                                       |
| `beats`            | No       | Beats before the tail                              | How many beats `beats.json` lists                                                       |
| `track`            | No       | —                                                  | The user's music (any audio or video file): measured, mixed unchanged under the effects |
| `trackLufs`        | No       | `-16`                                              | The track's level under the effects, before the master                                  |
| `beatBand`         | No       | `"low"`                                            | Measure the track's kick band (`"low"`) or everything (`"full"`)                        |
| `minBpm`, `maxBpm` | No       | `70`, `180`                                        | Tempo search range for the track                                                        |
| `seed`             | No       | `1337`                                             | Seeds `rand()` and `noise()`                                                            |
| `lufs`             | No       | `-14`                                              | Loudness target of the master                                                           |
| `output`           | No       | `public/<folder>/score.wav`                        | Where the WAV goes                                                                      |
| `compose(s)`       | Yes      | —                                                  | Places every effect; `s` is the session below                                           |

`music: true` exposes the engine's music instruments; it exists only for the kit repo's own reel
(`src/reel/score.mjs`), which predates R13. Films never set it.

## Session

| Member                                 | Gives                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `beat(n)`                              | Seconds of beat `n` (fractions allowed: `beat(4.5)` is the "and"); with a `track`, its measured beat |
| `bpm`, `beatSeconds`, `duration`, `SR` | Tempo, seconds per beat, length, 48000                                                               |
| `rand()`, `noise()`                    | Seeded random in [0, 1) and [−1, 1)                                                                  |

## Effects

Times in seconds; `g` is gain (about 0.3–1); `pan` −1 (left) to 1 (right). All are unpitched or
pitched only within one sound, so none reads as a melody.

| Call                                      | Sound                                                       | For                                              |
| ----------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `click(t0, g, pan)`                       | A bright snap over a short body, 5 ms                       | Cursor presses, a pill or button landing         |
| `tap(t0, g, pan)`                         | A soft low knock on glass                                   | Touch, counters, small elements settling         |
| `pop(t0, g, pan)`                         | A short upward bubble, 30 ms                                | An element appearing, a check, an iris opening   |
| `thud(t0, g, pan)`                        | A falling low sine and a muffled knock                      | Kinetic type slamming, something landing         |
| `swish(tPeak, len = 0.22, g, pan0, pan1)` | Thin high air, swelling to `tPeak`, then gone               | A small fast move: a word, a card, a tab         |
| `swoosh(tPeak, len = 0.6, g, pan0, pan1)` | Low and high air, band rising into `tPeak`, falling after   | A big move: a device arriving, a camera move     |
| `impact(t0, g)`                           | Sub boom and crack                                          | Scene changes, smash cuts, the lockup            |
| `riser(t0, len, g)`                       | Noise and a saw opening up over `len`                       | Builds, 1–2 bars                                 |
| `reverseCymbal(tEnd, len, g)`             | Noise swelling into `tEnd`, cut at the hit                  | Into a scene change                              |
| `whoosh(t0, len, g, f0, f1, pan0, pan1)`  | Swept band-passed noise from `t0`, peaking at 75 % of `len` | Older scores; prefer `swoosh`, timed by its peak |
| `tick(t0, g, f, pan)`                     | A 10 ms sine beep                                           | Older scores; prefer `click` or `tap`            |

Every call is logged to `cues.json` at its sync time: `t0`, the peak for `swish` and `swoosh`, the
start for `reverseCymbal` (`tEnd − len`).

## Sync to picture

The effect sits on the frame of its picture event, not merely on a beat near it.

| Picture event                         | Effect                            | Timing                                                                                                                 |
| ------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A move arrives (spring or ease)       | `swoosh` or `swish`               | `tPeak` at arrival: a spring's start + about 0.3 s (`default`), 0.2 s (`snappy`); an ease's start + 60 % of its length |
| A cursor press, a button lands        | `click`                           | The press frame (the `Cursor` click time)                                                                              |
| Type slams in                         | `thud`                            | The slam's beat                                                                                                        |
| An element appears                    | `pop`                             | Its first visible frame                                                                                                |
| A scene change, a smash cut, a lockup | `impact`, `reverseCymbal` into it | The cut's beat; the picture shakes on the same frame (R22)                                                             |
| A build                               | `riser` over 1–2 bars             | Ends half a beat before the drop; silence, then `impact`                                                               |

```js
// Effects only: a device lands on beat 4, a word rises from beat 5, a cursor clicks on 6, the cut on 8.
compose({ beat, swoosh, swish, click, impact, reverseCymbal }) {
  swoosh(beat(4) + 0.3, 0.5, 0.7);          // default spring from beat 4 arrives ≈ 0.3 s later
  swish(beat(5) + 0.25, 0.22, 0.45);
  click(beat(6), 0.7);
  reverseCymbal(beat(8), beat(1), 0.35);
  impact(beat(8), 0.8);
}
```

## Mix and master

- **Track**: decoded, level-matched to `trackLufs`, mixed unchanged under the effects.
- **Reverb**: a Schroeder hall; each effect has its own send.
- **Master**: 28 Hz high-pass, a 0.25 s fade at the end, loudness to −14 LUFS (ITU-R BS.1770) with a
  look-ahead limiter at −1.5 dBFS, 16-bit WAV with dither.

## Outputs

| File                      | Holds                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `public/<slug>/score.wav` | 48 kHz stereo, −14 LUFS                                                                                     |
| `cues.json`               | `{ bpm, duration, events: [{ type, t, args }] }`, `t` in seconds                                            |
| `beats.json`              | `{ bpm, period, offset, beats }`; from a track also `detectedBeats`, `maxResidualMs`, `downbeats`, `onsets` |
| `film.json`               | `audio` and `durationInFrames` updated                                                                      |

## Beat measurement

For a track, `score` and `beats` measure the grid from the audio: an onset-strength curve (low band:
the kick under 150 Hz; full band: everything above 40 Hz), a grid search over tempo and phase within
`minBpm`–`maxBpm`, each beat snapped to its nearest strong onset within ±30 ms, a least-squares line
fitted through them, and beats more than 8 ms off the line dropped and the line refitted.
`downbeats` are the bar phase whose beats hit hardest; `onsets` are full-band transients at least
80 ms apart. Effects-only films need none of this: their grid is the planned one.

## Traps

| Symptom                                    | Cause                                               | Fix                                                     |
| ------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------- |
| A swoosh lands before or after its move    | Timed by its start, or by the beat, not the arrival | `tPeak` at the arrival frame ([sync](#sync-to-picture)) |
| Tempo measured as double or half           | The search range admits the eighth-note grid        | Narrow `minBpm`/`maxBpm` around the real tempo          |
| Few beats detected in a track              | No kick in the low band                             | `beatBand: "full"`                                      |
| Loudness a few tenths off after AAC        | AAC shifts loudness slightly                        | Normal; `verify` allows ±1 LU                           |
| Film and WAV lengths differ                | `score` not rerun after changing `bars` or `tail`   | Rerun `npx motion-kit score`                            |
| `kick is not a function` in a film's score | Music instruments are not given to films (R13)      | Use effects; the user brings the music                  |
