---
name: make-motion-film
description: Make a motion-graphics film from a brief, however short — "a 15-second video of <URL>" included — showreel, story, self-introduction, product film from real screenshots, product UI motion, or app UI in liquid glass. Plans every beat with a designed transition at every join, gets the user's approval on a storyboard before any code, builds pure functions of the beat to the showreel's bar in 16:9, 9:16 and 1:1 from one timeline, adds sound effects on every picture event (the user brings any music), passes three independent review rounds, and shows the user the contact sheet and an animatic before the full render. Use when the user asks for a motion graphics video, a showreel, a promo or launch film, an animated story, an intro, or UI animation.
---

# Make a motion film

A film is a folder, `src/films/<slug>/`, holding its plan (`brief.md`), its storyboard
(`storyboard.json`), its sound (`score.mjs`), its beat grid (`beats.json`), its animation guide
(`ANIMATION_GUIDE.md`), its review log (`review_log.md`) and its picture (`Film.tsx`, `scenes/`).
Every frame is computed from the beat number `b`, so the sound, the picture and every format stay in
lock.

Before you start, read [references/pipeline.md](references/pipeline.md) (the folder, the clock and
the scene contract), the studio rules (the review-film skill's `references/studio-rules.md`,
R1–R26) and the showreel's benchmark sheet (the review-film skill's `references/reel-benchmark.jpg`):
it is the bar every film is held to, whatever its brand.

**Two gates, on every film** — the user approves the storyboard before any scene code or sound (R20),
and the contact sheet and animatic before the full render (R25). A short request does not skip them.

## Steps

1. **Pick the type** from the request and read its playbook. It sets the inputs, structure, look,
   sound and checks.

   | The request                                                                     | Playbook                                       |
   | ------------------------------------------------------------------------------- | ---------------------------------------------- |
   | Show what a designer, studio or model can do; "showreel"; "go all out"          | [types/showreel.md](types/showreel.md)         |
   | A history, a how-it-works, a narrative; "tell a story"                          | [types/story.md](types/story.md)               |
   | A short "who I am" or a brand opener, 5–15 s                                    | [types/intro.md](types/intro.md)               |
   | A launch or promo for a real product; "an n-second video of <URL>"              | [types/product-film.md](types/product-film.md) |
   | One morphing UI container driven by a cursor, state after state; "animate this" | [types/ui-motion.md](types/ui-motion.md)       |
   | iOS-style app UI, tab bars, widgets, liquid glass over a wallpaper              | [types/app-ui-glass.md](types/app-ui-glass.md) |

   If two fit, the one that sets the structure wins: a product launch with liquid glass is a
   product film using the glass patterns. **Any product UI on screen, in any type, follows
   [references/ui-motion-rules.md](references/ui-motion-rules.md)** (R26).

2. **Pick the style source**: the studio default (flat grounds, one accent, one display and one UI
   face); a **brand** (capture-brand skill, then read `docs/brands/<domain>/STYLE_GUIDE.md`); or a
   **reference video** (capture-reference-style skill: its style guide and shot list come first, and
   the user approves them before any code). A brand's restraint sets palette, type and how much
   things overshoot — never whether the film meets the showreel's bar (R12, R21, R22).

3. **Gather inputs**: what the playbook and, for UI, the UI motion rules list — always the duration
   and formats, a reference if the user has one, and whether they have a music track (without one
   the film has sound effects only, R13). Gather assets from the URL (capture-brand) and list them.
   Ask only for what you cannot find or make; never invent real-world facts, metrics or product UI.

4. **Check the setup**: `npx motion-kit doctor`; if it reports a missing setup, `npx motion-kit init`
   and `npm install`.

5. **Scaffold** — formats in the order the brief asks for; the first is the main composition:

   ```sh
   npx motion-kit new-film <slug> --title "<Title>" --bpm <bpm> --bars <bars> \
     --formats 9:16,1:1,16:9 --chapters "Hook,Reveal,Proof,Sign-off"
   ```

   It writes `src/films/<slug>/` and registers the film in `src/Root.tsx`.

6. **Plan every beat** in `src/films/<slug>/brief.md` (the playbook's structure on the grid): what is
   on screen on each beat, the technique, the copy, the join into the next chapter and the sound.
   Set `chapters.json` to match. Check the plan now, while it is cheap:

   - something new on every beat or two (R12); a different technique per chapter;
   - a designed transition at every join (R21) and a picture hit for every impact (R22), from
     [references/techniques.md](references/techniques.md);
   - no banned looks (R5–R9); UI moments as one container driven by a cursor or tap (R26).

7. **Storyboard and approval** (R20): write `storyboard.json` from the plan, render it with
   `npx motion-kit storyboard src/films/<slug>`, look at it, and show the user the board, the asset
   list and the plan ([references/storyboard.md](references/storyboard.md)). **Wait for the user's
   approval**; nothing below starts until they give it.

8. **Sound**: write `score.mjs` — sound effects only, each on its picture event, over the user's
   track if they gave one — and run `npx motion-kit score src/films/<slug>` (score-and-beats skill).
   This writes the WAV, `cues.json` and `beats.json`, and sizes the film.

9. **Animation guide**: before any scene, write `src/films/<slug>/ANIMATION_GUIDE.md` and the shared
   module the scenes import (`ui.tsx`: the clock, palette tokens, type scale, fonts, shared
   components) — which `SPRINGS` preset each kind of element uses, the curve for text, type sizes in
   units, how each chapter hands off to the next at its join. Every scene, and every subagent, codes
   to it, so the film moves as one.

10. **Stills pass**: build every shot's layout at its key beats before animating —
    `npx motion-kit sheet <id> --beats src/films/<slug>/beats.json` in every format — and fix
    composition, readability and the frame's layers while they are still cheap.

11. **Motion pass**, one component per chapter, each a pure function of its local beat
    ([references/pipeline.md](references/pipeline.md#scene-contract)). Lay out from `useLayout()`
    ([references/layout.md](references/layout.md)); take techniques, springs by role and joins from
    [references/techniques.md](references/techniques.md); effects through the apply-effect skill.

    - **Parallel scenes**: if your tool runs subagents, give each chapter to a `scene-animator` agent
      with its rows of the beat plan, its storyboard panels, `ANIMATION_GUIDE.md`, the style source
      and the file to write; wire the scenes into `FilmFrame` yourself.
    - **Pacing animatic**: once every chapter moves, `npx motion-kit render <id> --animatic`
      (960 × 540 for 16:9, with the sound) and check a strip of frames across every join and the
      cues around it; fix pacing before polish.

12. **Review and polish** with the review-film skill: an independent critic — the `film-critic`
    agent, never you (R23) — every format, at least three rounds logged in `review_log.md` (R24),
    until every criterion scores 8 or more. Don't rush to the final render: a film is a
    multi-session production, and the rounds are where it gets good.

13. **Animatic and approval** (R25): render the animatic again, then show the user the passing contact
    sheet, the last scorecard and the animatic. **Wait for the user's approval.**

14. **Render and deliver** with the render-and-deliver skill: every format, `verify` each file, and the
    poster and contact sheet beside them (a loop check if the film loops).

15. **Report**: the files, each format's length and loudness, the last scorecard, what the brief asked
    for that the film does not do with the reason, and what you would improve next.
