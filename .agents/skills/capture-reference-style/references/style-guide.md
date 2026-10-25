# Reference style guide and shot list

## Contents

- [Analysis fields](#analysis-fields)
- [Style guide sections](#style-guide-sections)
- [Shot list format](#shot-list-format)
- [Traps](#traps)
- [Example prompt](#example-prompt)

## Analysis fields

`refs/<name>/analysis.json`, written by `npx motion-kit reference`:

| Field                              | Holds                                                                                                                                                | Read it as                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `duration`, `size`, `fps`, `audio` | The source                                                                                                                                           |                                                                                 |
| `frames`                           | `{ every, files: [{ file, t }] }`: the study frames and their times                                                                                  | Cite frames by file and time                                                    |
| `cuts`                             | Times (s) of hard cuts, read from every frame: a jump above `max(12, 6 × median)` and at least 4× the change on either side                          | Hard cuts only; wipes, irises, morphs, dissolves and match cuts do not register |
| `shots`                            | `{ start, end, length, motion, pace }`; `motion` is the mean difference across 1 / `motionRate` s, `pace` is `still` (< 2), `moving` (< 6) or `fast` | The rhythm; `motion` compares shots within this video                           |
| `shotLength`                       | `count`, `median`, `min`, `max`, `cutsPerMinute`                                                                                                     | The guide's rhythm numbers                                                      |
| `palette`                          | Up to 8 colours `{ hex, share, lightness, chroma }` (k-means in OKLab), largest share first                                                          | Grounds are the big shares; an accent is a small share with high chroma         |
| `tone`                             | `meanLightness` (0–1), `contrast` (lightness spread), `meanChroma`                                                                                   | Dark or light, flat or punchy, muted or saturated                               |
| `grain`                            | `sigma`: noise estimate on 0–255; under ~1.5 clean, over ~4 visibly grainy                                                                           | Texture; compression also adds a little                                         |
| `method`                           | Cut threshold, `scanFps` (the source's rate), `motionRate`, median difference                                                                        | Why a cut was or was not found                                                  |

The cut detector finds hard cuts only: a designed transition (wipe, iris, morph, dolly into a
surface) changes the frames around it too, so it does not register, and a flash can register as a
cut. Check every listed cut and every shot over ~4 s in the frames before quoting them, and list the
transitions you find there in the guide.

## Style guide sections

`docs/references/<name>/STYLE_GUIDE.md`. Each section states the rule as something a film can
follow, and its evidence.

| Section            | Says                                                                                                         | Evidence                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| Source             | File, length, size, fps, date studied; one line on what the reference is (genre, not content)                | `analysis.json`                |
| Palette            | Ground, text and accent colours as hex, with share; how they are used (grounds flat or graded, accent where) | `palette`, frames              |
| Type               | Family (or nearest and a substitute), weight, case, tracking, size relative to frame, placement              | Frames with type               |
| Rhythm             | Median, min and max shot length, cuts per minute, how pace changes across the film (builds, holds)           | `shotLength`, `shots`          |
| Transitions        | Each kind with where it occurs: hard cut, match cut, whip, wipe, morph, dissolve, flash                      | Frames either side of each cut |
| Camera             | Static, push, pan, orbit, handheld shake; how fast; on what                                                  | Consecutive frames in a shot   |
| Texture            | Grain, blur, halation, dither, flat vector; grain sigma                                                      | `grain`, full-size frames      |
| Text motion        | How text enters and exits (mask, type-on, scale, slide), how long it holds                                   | Frames across a text's life    |
| Sound (if `audio`) | Tempo feel and where cuts land relative to the music, judged from cut spacing; listen notes are estimates    | `cuts`, the user's description |
| Do / Don't         | Five or so rules a film must follow to read as this style, and what would break it                           | The sections above             |
| Not taken          | The reference's content that must not appear: logos, characters, footage, words, music                       | —                              |

Map the guide onto the kit where it helps: an accent for R11, the display and UI faces for R10, a
filter or grain from the apply-effect skill for the texture, transitions from the make-motion-film
skill's techniques. Where the reference breaks a studio rule (centred titles, fades), say so: the
user decides whether the reference or the rule wins.

## Shot list format

`docs/references/<name>/SHOTLIST.md`:

```markdown
# <Subject> — shot list in the style of <name>

<length> s, <format>, <shot count> shots; median shot <n> s (reference: <m> s).

| #   | Time      | Length | Content (new) | Transition in | Camera   | Type               | Notes |
| --- | --------- | ------ | ------------- | ------------- | -------- | ------------------ | ----- |
| 1   | 0.0–1.8 s | 1.8 s  | …             | —             | push 5 % | mask rise, 2 words | hook  |
```

- **Lengths follow the reference's rhythm** (its median and range, and where it speeds up or holds),
  scaled to the new film's length.
- **Content is the user's subject**, never a scene from the reference re-dressed.
- **Each shot names its grammar** from the guide, so every row can be checked against it.

## Traps

| Symptom                                          | Cause                                            | Fix                                                                |
| ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------ |
| One long "shot" across visibly different scenes  | The joins are dissolves or morphs, not hard cuts | Read the frames; list them as transitions in the guide             |
| Many tiny shots in one scene                     | Flashes or fast moves crossed the threshold      | Check those cuts in the frames; drop the false ones                |
| Palette dominated by black or white              | Letterbox bars or a white UI                     | Name the grounds; take the accent from the small shares            |
| Shots shorter than 0.5 s missing from the frames | The study frames are 0.5 s apart                 | Rerun with `--every 0.25` (cuts are read from every frame already) |

## Example prompt

Kept verbatim; this file is its home. A style source, not a video type: the reference's grammar
applied to new content. `npx motion-kit reference` does step 1; the skill writes the two files under
`docs/references/<name>/` rather than `./docs/`, so several references can coexist.

```text
Reference: ./refs/launch.mp4 (and ./refs/frames/*.png)

1. Extract one frame every 0.5s with ffmpeg. Study them.
2. Write ./docs/style_guide.md: palette (hex), type (family, weight, tracking),
   shot lengths, transition types, camera moves, texture/grain, how text enters and exits.
3. Write ./docs/shotlist.md for a [DURATION]s video about [SUBJECT] in THAT style.
   Take the grammar of the reference, never its content, logos or characters.
4. Show me both files. Wait for my OK before any code.
```
