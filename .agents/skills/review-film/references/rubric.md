# Review rubric

Nine criteria (R17), each scored 1–10. **8 is the bar to ship**: every criterion at 8 or more (R18),
after at least three rounds (R24). Score what the frames show, not what the code intends, and cite
frames as evidence. Hold the film to the showreel: compare it with
[reel-benchmark.jpg](reel-benchmark.jpg), the reel's own per-beat sheet — an 8 is a film that would
not look out of place cut next to it.

| Criterion                 | 8 means                                                                                                                                                                      | Typical failures (score ≤ 6)                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Hook in the first 2 s     | Frame 0 already shows the subject in motion; by 2 s the viewer knows what this is and wants the next shot                                                                    | Empty or static opening, a title fading in, a logo before anything happens                                         |
| Readability at phone size | Every word reads on the 360 px phone sheet: UI text ≥ 56 px at 1920 × 1080 (≈ 5 % of height), display type large, strong contrast, nothing cropped, each line on long enough | Small captions, low-contrast text over busy backdrops, words cut by the frame edge                                 |
| Motion quality            | Every join is a designed transition (R21); big moves anticipate and settle with weight, impacts get a picture hit (R22); fast moves carry blur; crisp effects stay crisp     | Hard cuts nothing hides, linear slides, everything on one curve, an impact with no reaction, jitter                |
| Variety                   | Something new on every beat or two, no dead beats (R12); no technique twice in a row; scale, ground and pace change                                                          | Holds of 3+ beats, one look throughout, the same rise-and-settle on every element                                  |
| Composition               | Each frame has one clear subject and a deliberate layout: inside `safe`, balanced in every format, no empty half-frames, no collisions                                       | Subject small in a sea of white, text over the product, a layout scaled from 16:9 rather than reflowed             |
| Depth                     | Layers read: foreground, subject and ground move at different rates, overlap, cast or receive shadow, or sit at different focus — the frame is not one flat plane            | Everything on one plane at one speed; cut-outs pasted on white with no shadow or parallax                          |
| Brand accuracy            | Palette, faces and voice match the brand or style source; one accent (R11); no banned defaults (R5–R9)                                                                       | Off-palette colours, extra fonts, gradients or glow the brand never uses                                           |
| Sound sync                | Every effect lands on its picture event within a frame and every hit on screen has one; no composed music (R13); loudness −14 LUFS ± 1                                       | A whoosh that peaks before the move arrives, silence where a hit is due, a melody, loudness off                    |
| Polish                    | Details hold at full size: crops on real edges, alignment and spacing consistent, crisp type, no popping, flicker, stray pixels or half-covered elements                     | A crop that shows a neighbour's edge, a cover that misses a corner, text a few px off its grid, a one-frame glitch |

## Look for

Name every one you find, with frames:

- Dead beats: a beat where nothing new happens (compare neighbouring cells of the per-beat sheet).
- A hard cut at a chapter join that no motion, match or impact hides.
- Anything sliding in on one curve with no anticipation or settle; everything moving the same way.
- An impact in `cues.json` with no picture reaction on its frame.
- Text overlapping during a swap; text blurred by scaling.
- Corner labels, frame borders, a centred title on a gradient, everything fading in (R5–R7).
- A screenshot cut along lines that are not in it (tiles, slices); redrawn product UI.
- Loop-seam stutter, if the film loops.

## How to score

- **Look at the per-beat sheet first** (R16), then an offset sheet (half a beat later) to see the
  motion between hits, strips of frames around every join and every fast action, and the phone sheet.
- **Check crisp effects and small text at full size** — thumbnails alias dither and mosaic.
- **Sound sync**: compare the frame of each cue in `cues.json` (`t × fps`) with what the picture does
  on that frame; loudness comes from `npx motion-kit verify` once a render with audio exists.

## Scorecard format

The author appends each round's scorecard to the film's `review_log.md` (R24).

```text
Round <n>
| Criterion      | Score | Evidence (frames)                          |
| Hook           | 7     | f0–f60: ball and outline visible, but …    |
| …              |       |                                            |
Worst three, with fixes:
1. <problem> — <frames> — <concrete fix: file / prop / timing>
2. …
3. …
Verdict: ship | fix and re-review
```
