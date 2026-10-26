---
name: review-film
description: Review a motion-graphics film before the full render — contact sheets (one frame per beat), offset sheets, strips across every join and fast action and a phone-size sheet, scored independently 1–10 on hook, phone readability, motion quality, variety, composition, depth, brand accuracy, sound sync and polish against the showreel's benchmark sheet, then the scorecard, the three worst problems with proposed fixes and an animatic go straight to the user, who decides what to fix — one review per pass, no fix loop. Use before showing or rendering any film, when the user asks for feedback on a video, or to check work against the studio rules.
---

# Review a film

The studio rules' review loop ([references/studio-rules.md](references/studio-rules.md), R16–R19 and
R23–R25), done with stills: it catches problems before a full render costs minutes. Score with
[references/rubric.md](references/rubric.md), against the reel's
[benchmark sheet](references/reel-benchmark.jpg).

**The goal is to get the film in front of the user** with an honest second opinion, not to converge
alone: one review, then the user decides (R18, R24, R25).

**The author never scores their own film (R23).** If your tool runs subagents, hand the scoring
(steps 2–5) to the `film-critic` agent. Without subagents, ask
the user to run the review in a fresh session, and say so; do not score it yourself and call it
reviewed.

## Steps

1. **Find the inputs**: the composition id, the film's `beats.json` and `cues.json`, the brief and the
   approved storyboard (type, brand or style source, format), and `review_log.md` if earlier rounds
   exist.
2. **Per-beat sheet** (R16):
   `npx motion-kit sheet <composition> --beats <path/to/beats.json>` — no grid yet: `--count 24`.
   Open `out/sheet-<composition>.png` and look at every frame beside the benchmark sheet.
3. **Between the beats and across joins**:
   - `npx motion-kit sheet <composition> --beats <beats.json> --offset 0.5` shows each motion half a
     beat after its hit.
   - For every chapter join and every fast action, a strip of 12 frames around it:
     `npx motion-kit sheet <composition> --frames <f-12,f-8,…,f+12> --cols 6 --out out/strip-<n>.png`.
   - The phone view, read every word at this size:
     `npx motion-kit sheet <composition> --beats <beats.json> --width 360 --cols 6 --out out/phone-<composition>.png`
4. **Full size where detail matters**: `npx motion-kit still <composition> <frame>` for small text,
   dither, pixel effects and glass.
5. **Score the nine criteria** with evidence, in the rubric's scorecard format (R17), go through its
   "Look for" list, and name the three worst problems, each with frames and a concrete fix.
6. **Log the review** in `src/films/<slug>/review_log.md` (R24): the scorecard and the three
   problems with their proposed fixes.
7. **Show the user, without fixing first** (R18, R25): the animatic,
   `npx motion-kit render <composition> --animatic` (half size, with sound), the contact sheet, the
   scorecard, and the three worst problems as options — which are quick fixes, which are limited by
   the assets or the brief. Open the animatic for them (R30): QuickTime when it is available
   (`open -a "QuickTime Player" <file>`), otherwise its full path. Wait for the user's decision.
8. **Do what the user decides**: fix what they pick (log what changed), review again only if they ask,
   or go on to the full render.
9. **Render only after the user approves** (R19) — the render-and-deliver skill.
