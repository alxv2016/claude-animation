---
name: make-motion-film
description: Make a motion-graphics film from a brief — showreel, story, self-introduction, product film from real screenshots, product UI motion, or app UI in liquid glass — planned on a beat grid, scored in code, built as pure functions of the beat, in 16:9, 9:16 and 1:1 from one timeline, reviewed on contact sheets before the full render. Use when the user asks for a motion graphics video, a showreel, a promo or launch film, an animated story, an intro, or UI animation.
---

# Make a motion film

A film is a folder, `src/films/<slug>/`, holding its plan (`brief.md`), its score (`score.mjs`),
its measured beat grid (`beats.json`) and its picture (`Film.tsx`). Every frame is computed from
the beat number `b`, so the music, the picture and every format stay in lock.

Before you start, read [references/pipeline.md](references/pipeline.md) (the folder, the clock and
the scene contract) and the studio rules (the review-film skill's `references/studio-rules.md`,
R1–R19). They apply to every film unless the brief says otherwise.

## Steps

1. **Pick the type** from the request and read its playbook. It sets the inputs, structure, look,
   sound and checks.

   | The request                                                            | Playbook                                       |
   | ---------------------------------------------------------------------- | ---------------------------------------------- |
   | Show what a designer, studio or model can do; "showreel"; "go all out" | [types/showreel.md](types/showreel.md)         |
   | A history, a how-it-works, a narrative; "tell a story"                 | [types/story.md](types/story.md)               |
   | A short "who I am" or a brand opener, 5–15 s                           | [types/intro.md](types/intro.md)               |
   | A launch or promo for a real product, from its site and screenshots    | [types/product-film.md](types/product-film.md) |
   | One morphing UI container driven by a cursor, state after state        | [types/ui-motion.md](types/ui-motion.md)       |
   | iOS-style app UI, tab bars, widgets, liquid glass over a wallpaper     | [types/app-ui-glass.md](types/app-ui-glass.md) |

   If two fit, the one that sets the structure wins: a product launch with liquid glass is a
   product film using the glass patterns.

2. **Pick the style source**: the studio default (flat grounds, one accent, one display and one UI
   face); a **brand** (capture-brand skill, then read `docs/brands/<domain>/STYLE_GUIDE.md`); or a
   **reference video** (capture-reference-style skill: its style guide and shot list come first, and
   the user approves them before any code).

3. **Gather inputs**: what the playbook lists as required. Ask only for what you cannot find or
   make; never invent real-world facts, metrics or product UI.

4. **Check the setup**: `npx motion-kit doctor`; if it reports a missing setup, `npx motion-kit init`
   and `npm install`.

5. **Scaffold** — formats in the order the brief asks for; the first is the main composition:

   ```sh
   npx motion-kit new-film <slug> --title "<Title>" --bpm <bpm> --bars <bars> \
     --formats 9:16,1:1,16:9 --chapters "Hook,Reveal,Proof,Sign-off"
   ```

   It writes `src/films/<slug>/` and registers the film in `src/Root.tsx`.

6. **Plan every beat** in `src/films/<slug>/brief.md` (the playbook's structure on the grid): what is
   on screen on each beat, the technique, the copy, the sound. Set `chapters.json` to match. Check the
   plan against R5–R12 now, while it is cheap.
   - **Checkpoint**: if the brief asks to see a plan, storyboard or state list first, if the film is
     about a real product or real facts, or if the style comes from a reference, show `brief.md` and
     **wait for the user's OK**. Otherwise continue and include the plan in your first report.

7. **Score it**: write `score.mjs` and run `npx motion-kit score src/films/<slug>` (score-and-beats
   skill). This writes the WAV, `cues.json` and the measured `beats.json`, and sizes the film. With a
   supplied track, the skill's "supplied track" steps: `master`, then `beats`, then set `audio` and
   `durationInFrames` in `film.json` by hand.

8. **Build the scenes**, one component per chapter, each a pure function of its local beat
   ([references/pipeline.md](references/pipeline.md#scene-contract)). Lay out from `useLayout()`
   ([references/layout.md](references/layout.md)); reach for the helpers and techniques in
   [references/techniques.md](references/techniques.md) and effects through the apply-effect skill.
   - **Parallel scenes**: if your tool runs subagents, give each chapter to a `scene-animator` agent
     with its rows of the beat plan, the style source and the file to write; wire the scenes into
     `FilmFrame` yourself.
   - After each scene: `npx motion-kit sheet <id> --beats src/films/<slug>/beats.json` and look.

9. **Review** with the review-film skill (or the `film-critic` agent): every format, until every
   criterion scores 8 or more.

10. **Render and deliver** with the render-and-deliver skill: every format, then `verify` each file.

11. **Report**: the files, each format's length and loudness, the last scorecard, and what the brief
    asked for that the film does not do, with the reason.
