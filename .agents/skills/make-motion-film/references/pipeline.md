# Film pipeline: folder, clock and scene contract

## Contents

- [Film folder](#film-folder)
- [Clock](#clock)
- [Scene contract](#scene-contract)
- [Syncing to cues](#syncing-to-cues)
- [Formats](#formats)
- [Traps](#traps)

## Film folder

`npx motion-kit new-film <slug>` writes `src/films/<slug>/`. In a project set up with `init`, the
kit's library is vendored at `src/motion-kit/` (`lib/`, `effects/`, `brand/`); in the kit's own repo
it is `src/`.

| File            | Holds                                                                                        | Written by                             |
| --------------- | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| `film.json`     | `id`, `title`, `fps`, `bpm`, `bars`, `tail` (s), `formats`, `durationInFrames`, `audio`      | `new-film`; `score` sets the last two  |
| `brief.md`      | Brief and the beat plan: every beat's picture, technique, copy and sound                     | You, from the template                 |
| `chapters.json` | `[{ start, name, scene? }]`, `start` in beats                                                | `new-film --chapters`; you             |
| `score.mjs`     | The music and SFX, synthesized in code                                                       | You (score-and-beats skill)            |
| `beats.json`    | The **measured** beat grid: `offset`, `period`, `beats[]`, `bpm`, `detectedBeats`, residuals | `score` / `beats` (planned until then) |
| `cues.json`     | Every cue the score placed: `{ type, t, args }`, `t` in seconds                              | `score`                                |
| `Film.tsx`      | `FilmFrame({ b })`, the `Film` component (motion blur, audio) and one composition per format | `new-film`; you replace the scenes     |

The WAV goes to `public/<slug>/score.wav`, since Remotion only serves files from `public/`.

Composition ids: the first format is `<slug>`, the others `<slug>-9x16`, `<slug>-1x1`, `<slug>-16x9`.

## Clock

`beatClock(grid)` from `motion-kit/lib/film` turns the measured grid into the film's clock:

| Member            | Gives                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------- |
| `beatAt(seconds)` | Fractional beat number at a time: `(t − offset) / period`                               |
| `timeAtBeat(b)`   | Seconds of a beat                                                                       |
| `sec(beats)`      | A duration in beats, in seconds: springs take seconds (`springKD(clock.sec(local), …)`) |
| `bar(b)`          | 0-based bar of a beat                                                                   |
| `period`          | Seconds per beat                                                                        |

`chapterAt(chapters, b)` returns `{ chapter, index, local }`, where `local` is beats since the
chapter's start.

The beat grid is **measured from the rendered WAV**, not computed from the BPM: the measured offset
and period are what the ear hears (studio rule R14). Before `score` runs, `beats.json` holds the
planned grid so scenes can be built; rerun `score` after changing the music.

## Scene contract

- A scene is a component that takes `local` (beats since its chapter began) and computes everything
  from it: positions, springs, text, colours. No `useState`, `useEffect`, timers, CSS transitions,
  `Math.random` or values carried from frame to frame (R1–R3).
- **Events sit on beats.** "The card lands on beat 3" is `springKD(clock.sec(local - 3), 220, 26)`;
  before beat 3 that spring is 0, so nothing moves early.
- **A value with several targets is a sum of springs**, one per change:
  `track(t, [[t0, a], [t1, b], …])`. Never restart a spring from where the last one stopped; there is
  no "last frame".
- **Scenes overlap across a join** when the transition needs both: render the outgoing and the
  incoming scene together for the join's beats, each from its own local beat.
- Size type and spacing in layout units (`unit`), place things inside `safe`, never at fixed pixels
  ([layout.md](layout.md)).
- Keep scenes in `src/films/<slug>/scenes/<Name>.tsx` once `Film.tsx` grows past a few hundred lines;
  have `FilmFrame` pick the scene by `chapter.scene ?? chapter.name`.

## Syncing to cues

The beat grid places most hits. For notes that are not on beats (a piano phrase, a fill, a riser's
peak), read `cues.json`: each cue's `t` is in seconds of the WAV, so `clock.beatAt(cue.t)` is its
beat. Filter by `type` (`"piano"`, `"impact"`, …) and cut or hit on those beats.

## Formats

Every format renders the same `FilmFrame` at the same beats; only the layout changes. Plan for the
narrowest format first: if the brief leads with 9:16, compose for portrait and widen for 16:9, not
the reverse. See [layout.md](layout.md).

## Traps

| Symptom                                 | Cause                                                             | Fix                                                  |
| --------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| Hits a few frames early or late         | Times computed from BPM, not the measured grid                    | Use `clock.timeAtBeat` / `beatAt` from `beats.json`  |
| Film ends before the music              | `durationInFrames` not updated after a score change               | Rerun `npx motion-kit score`; it resizes `film.json` |
| Silent in the render                    | `film.audio` is `null` (no score yet) or points outside `public/` | Run `score`; supplied tracks go under `public/`      |
| Motion jitters only in the final render | State carried between frames breaks under motion-blur subframes   | Make the scene a pure function of `local`            |
| Studio playback stutters                | Motion blur in preview                                            | The template blurs only when rendering; keep it so   |
| A spring jumps when the chapter starts  | Spring measured from the film's start, not the chapter's          | Pass `local`, not `b`                                |
