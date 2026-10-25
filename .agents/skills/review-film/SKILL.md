---
name: review-film
description: Review a motion-graphics film before the full render — contact sheets (one frame per beat), offset sheets and transition strips, scored 1–10 on hook, phone readability, motion quality, variety, brand accuracy and sound sync, then fix the three worst problems and repeat until every score is 8+. Use before showing or rendering any film, when the user asks for feedback on a video, or to check work against the studio rules.
---

# Review a film

The studio rules' review loop ([references/studio-rules.md](references/studio-rules.md), R16–R19),
done with stills: it catches problems before a full render costs minutes. Score with
[references/rubric.md](references/rubric.md).

**Fresh eyes score better.** If your tool runs subagents, hand the scoring (steps 2–4) to the
`film-critic` agent and do the fixes yourself; it did not write the film, so it is not anchored on
what the code meant to do.

## Steps

1. **Find the inputs**: the composition id, the film's `beats.json` if it has a score, and the
   brief (type, brand or style source, format).
2. **Per-beat sheet** (R16):
   `npx motion-kit sheet <composition> --beats <path/to/beats.json>` — no score yet:
   `--count 24`. Open `out/sheet-<composition>.png` and look at every frame.
3. **Between the beats**: `npx motion-kit sheet <composition> --beats <beats.json> --offset 0.5`
   shows each motion half a beat after its hit. For each scene change, a strip across the join:
   `npx motion-kit sheet <composition> --frames <f-12,f-6,f,f+6,f+12> --out out/strip-<n>.png`.
4. **Full size where detail matters**: `npx motion-kit still <composition> <frame>` for small text,
   dither, pixel effects and glass.
5. **Score the six criteria** with evidence, in the rubric's scorecard format (R17). Name the three
   worst problems, each with frames and a concrete fix.
6. **Fix those three, then repeat from step 2** until every criterion scores 8 or more (R18). Keep
   each round's scorecard; show the user the last one.
7. **Only then render** the film (R19) — the render-and-deliver skill.
