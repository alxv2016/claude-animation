---
name: score-and-beats
description: Compose and master a film's music and sound effects in code — drums, bass, pads, FM plucks and chimes, a modelled acoustic piano, whooshes, risers and impacts — at −14 LUFS, then measure the beat grid from the rendered audio so picture lands on what the ear hears; or master a supplied track and measure its beats. Use when a film needs a score, sound design, SFX on cuts, a piano score, beat sync, or a supplied song loudness-matched and beat-mapped.
---

# Score and beats

The score is a module, `score.mjs`, that places notes and hits on the beat. `npx motion-kit score`
synthesizes it at 48 kHz, masters it to −14 LUFS, logs every cue, and **measures** the beat grid
from the WAV it wrote (studio rules R13–R15). Every instrument and its arguments:
[references/instruments.md](references/instruments.md).

## Steps — a synthesized score

1. **Read the beat plan** (`src/films/<slug>/brief.md`): the Sound column says what each beat needs.
   Every scene change wants a hit; every big move wants a whoosh, riser or reverse cymbal into it.
2. **Write `src/films/<slug>/score.mjs`** (`new-film` leaves a starter): `bpm`, `bars`, `tail`, and
   `compose(session)`, placing every cue with `beat(n)` so it sits on the grid. Write the harmony
   first (a progression, one chord per bar), then the groove, then the SFX on the plan's beats.
   Patterns: [references/instruments.md](references/instruments.md#patterns).
3. **Render**: `npx motion-kit score src/films/<slug>`. It prints the WAV's loudness and peak, the cue
   count and the measured grid; it writes `public/<slug>/score.wav`, `cues.json`, `beats.json`, and
   sets `audio` and `durationInFrames` in `film.json`.
4. **Check the grid line**: the detected count should be close to the beat count, and the max
   residual under ~8 ms. If few beats are detected, the low band has no clear pulse (no kick): set
   `beatBand: "full"` in `score.mjs` and rerun.
5. **Listen through the numbers**: `npx motion-kit verify public/<slug>/score.wav` (loudness, peak).
   You cannot hear the score; tell the user it is untested by ear and where to play it.
6. **Sync**: scenes read `beats.json` through the film's clock; off-beat notes (a melody, a fill)
   through `cues.json` (make-motion-film skill, `references/pipeline.md`, "Syncing to cues").

## Steps — a supplied track

1. Put it under `public/` (or anywhere; `master` writes into `public/`).
2. **Master**: `npx motion-kit master <track> --out public/<slug>/track.wav` (−14 LUFS, −1.5 dBFS
   ceiling). Any audio or video file decodes.
3. **Measure**: `npx motion-kit beats public/<slug>/track.wav --out src/films/<slug>/beats.json`
   (`--bpm 70-140` to steer the tempo search, `--band full` for music without a kick).
4. **Point the film at it**: in `film.json` set `audio` to `<slug>/track.wav` and `durationInFrames`
   to the length you use × `fps`.
5. Only use tracks the user supplied or confirmed are licensed; say so in the report.

## Rules

- **Hits on the measured grid** (R14): picture reads `beats.json`; never compute times from the BPM.
- **Rerun `score` after every change** to the music: the grid, cues and length all follow the WAV.
- **Seeded**: the session's `rand()` and `noise()` are seeded (`seed` in `score.mjs`), so the same
  score renders the same file every time.
- **Pair every cue with something on screen**, and every hit on screen with a cue; silence is a cue
  too (the half-beat before a drop).
