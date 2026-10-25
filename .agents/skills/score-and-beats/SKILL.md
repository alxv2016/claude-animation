---
name: score-and-beats
description: Design a film's sound in code — clicks, taps, pops, swishes, swooshes that peak on the frame a move arrives, thuds, impacts, risers and reverse cymbals — one effect on every picture event, mastered at −14 LUFS; mix them over the user's own music track, measuring its beats, downbeats and onsets so picture and effects land on what the ear hears. The kit never composes music. Use when a film needs sound design, SFX on cuts and UI actions, beat sync, or a supplied song loudness-matched and beat-mapped.
---

# Sound and beats

The sound is a module, `score.mjs`, that places effects on picture events. `npx motion-kit score`
synthesizes them at 48 kHz, mixes them over the user's track if there is one, masters to −14 LUFS,
logs every cue and writes the beat grid (studio rules R13–R15). Every effect and its arguments, and
how to sync each to picture: [references/instruments.md](references/instruments.md).

**No music from the kit** (R13): the engine gives films effects only. Background music is the user's
— ask for a track; without one, the film is sound design alone, which the user can score later.

## Steps — effects only

1. **Read the beat plan and storyboard** (`src/films/<slug>/brief.md`, `storyboard.json`): the Sound
   column names each picture event. Every scene change wants a hit, every big move a swoosh, every
   UI press a click.
2. **Write `src/films/<slug>/score.mjs`** (`new-film` leaves a starter): `bpm`, `bars`, `tail`, and
   `compose(session)`, placing every effect at its picture event with `beat(n)` — a swoosh peaks on
   the beat the move arrives, a click sits on the beat a press lands ([sync to
   picture](references/instruments.md#sync-to-picture)).
3. **Render**: `npx motion-kit score src/films/<slug>`. It prints the WAV's loudness and peak and the
   cue count; it writes `public/<slug>/score.wav`, `cues.json`, the planned `beats.json` (exact: the
   code placed every effect on it), and sets `audio` and `durationInFrames` in `film.json`.
4. **Listen through the numbers**: `npx motion-kit verify public/<slug>/score.wav` (loudness, peak).
   You cannot hear the sound; tell the user it is untested by ear and where to play it.
5. **Sync**: scenes read `beats.json` through the film's clock; effects off the beat through
   `cues.json` (make-motion-film skill, `references/pipeline.md`, "Syncing to cues").

## Steps — over the user's track

1. Put the track under `public/<slug>/` (any audio or video file decodes). Only use a track the user
   supplied or confirmed is licensed; say so in the report.
2. **Set `track`** in `score.mjs` (and `minBpm`/`maxBpm` around its tempo, `beatBand: "full"` if it
   has no kick). `score` measures the track first, so `beat(n)` follows its beats; the track plays
   unchanged, level-matched to `trackLufs` (−16 by default) under the effects.
3. **Place effects** as above, with big moments on `beats.json`'s `downbeats` and small UI sounds on
   its `onsets` where they fall near a picture event.
4. **Render and check the grid line**: the detected count should be close to the beat count and the
   max residual under ~8 ms; if few beats are detected, narrow the tempo range or use the full band.
5. For a track with no effects at all: `npx motion-kit master <track> --out public/<slug>/track.wav`
   (−14 LUFS), `npx motion-kit beats public/<slug>/track.wav --out src/films/<slug>/beats.json`, then
   set `audio` and `durationInFrames` in `film.json` by hand.

## Rules

- **Every effect on a picture event, every hit on screen with an effect** (R13, R22): no effect
  without something to see, no impact without a picture hit.
- **Hits on the grid** (R14): picture reads `beats.json`; never compute times from the BPM.
- **Rerun `score` after every change** to the sound: the grid, cues and length all follow the WAV.
- **Seeded**: the session's `rand()` and `noise()` are seeded (`seed` in `score.mjs`), so the same
  sound renders the same file every time.
