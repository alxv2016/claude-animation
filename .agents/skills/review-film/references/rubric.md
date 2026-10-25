# Review rubric

Six criteria (R17), each scored 1–10. **8 is the bar to ship**: every criterion at 8 or more (R18).
Score what the frames show, not what the code intends, and cite frames as evidence.

| Criterion                 | 8 means                                                                                                                                                                      | Typical failures (score ≤ 6)                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Hook in the first 2 s     | Frame 0 already shows the subject in motion; by 2 s the viewer knows what this is and wants the next shot                                                                    | Empty or static opening, a title fading in, a logo before anything happens         |
| Readability at phone size | Every word reads on a phone: UI text ≥ 56 px at 1920 × 1080 (≈ 5 % of height), display type large, strong contrast, nothing cropped, each line on screen long enough to read | Small captions, low-contrast text over busy backdrops, words cut by the frame edge |
| Motion quality            | Every move eases or springs with intent; transitions hide the cut; fast moves carry blur; crisp effects stay crisp                                                           | Linear slides, pops and jitter, an element snapping in, soft dither under blur     |
| Variety                   | Something new every 2–4 s (R12); no technique twice in a row; scale, ground and pace change                                                                                  | One look throughout, long holds, the same move repeated                            |
| Brand accuracy            | Palette, faces and voice match the brand or style source; one accent (R11); no banned defaults (R5–R9)                                                                       | Off-palette colours, extra fonts, gradients or glow the brand never uses           |
| Sound sync                | Hits and cuts land on the measured grid within a frame; loudness −14 LUFS ± 1                                                                                                | Cuts between beats, silence where a hit is due, loudness far off target            |

## How to score

- **Look at the per-beat sheet first** (R16), then an offset sheet (half a beat later) to see the
  motion between hits, then strips across each transition.
- **Check crisp effects and small text at full size** — thumbnails alias dither and mosaic.
- **Sound sync**: compare frame numbers of hits against `beats.json` (beat time × fps); loudness
  comes from `npx motion-kit verify` once a render with audio exists.

## Scorecard format

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
