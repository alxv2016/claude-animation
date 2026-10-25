# AGENTS.md

Instructions for AI coding agents working in this repo — Claude Code, Codex, Cursor, Gemini CLI or any
other tool that reads `AGENTS.md`.

## What this repo is

**motion-kit**: a kit for making motion-graphics films with AI agents — Remotion film tooling, WebGL
effects (backgrounds, filters over footage, liquid glass), website brand capture, and portable skills
and agents. It is also the kit's test bench: the showreel in `src/reel/` and the effects showcase in
`src/effects/showcase/` are built with it.

## Start here

- **Setup and commands**: [README.md](README.md).
- **The kit CLI**: `npm run mk -- <command>` in this repo; `npx motion-kit <command>` in any other
  project. `--help` lists the commands. Prefer the CLI over calling scripts directly.
- **Docs** (written to [docs/DOCUMENTATION_GUIDELINES.md](docs/DOCUMENTATION_GUIDELINES.md)):
  - [docs/MOTION_KIT.md](docs/MOTION_KIT.md) — the kit, the CLI, and how skills and agents are packaged
  - [docs/MOTION_REEL.md](docs/MOTION_REEL.md) — the showreel, motion techniques, and the studio rules
    and example prompts (§22)
  - [docs/EFFECTS.md](docs/EFFECTS.md) — shader backgrounds, filters, liquid glass
  - [docs/BRAND_CAPTURE.md](docs/BRAND_CAPTURE.md) — brand capture internals

## Rules for every film

1. **Every frame is a pure function of time** — compute everything from the frame number; no
   `Math.random`, timers, `requestAnimationFrame`, CSS transitions or state carried between frames
   ([MOTION_REEL.md §1](docs/MOTION_REEL.md#1-rules)).
2. **Two gates, on every film, however short the request** — the user approves a storyboard before
   any scene code or sound, and the contact sheet and an animatic before the full render (R20, R25).
3. **Follow the studio rules** ([R1–R26](.agents/skills/review-film/references/studio-rules.md)): no
   banned defaults, one display face and one UI face, one accent, something new on every beat or two,
   a designed transition at every join, springs by role and a picture hit on every impact, product UI
   as one container driven by a cursor, sound effects on picture events at −14 LUFS (never composed
   music: the user brings the track), and at least three independent review rounds before any full
   render. The bar is the showreel ([benchmark](.agents/skills/review-film/references/reel-benchmark.jpg)).
4. **Render with the `angle` GL backend** — `render.mjs` and `remotion.config.ts` set it; WebGL
   effects depend on it.
5. **Look before you claim it works** — render stills or a frame sheet and inspect them.

## Skills and agents

Their home is `.agents/`: `.agents/skills/<name>/SKILL.md` (procedures, with reference files beside
them) and `.agents/agents/<name>.md` (role prompts). They are plain Markdown any tool can read; when a
task matches a skill's description, read its `SKILL.md` and follow it. Claude Code loads them through
symlinks in `.claude/`, created by `npm run mk -- skills install`. Edit the files in `.agents/`,
never through `.claude/`.

## Working rules

- **Change docs in the same commit as the code they describe**
  ([DOCUMENTATION_GUIDELINES.md §8](docs/DOCUMENTATION_GUIDELINES.md#8-keeping-docs-true)).
- **Skills hold steps, docs hold rules and reasons**: a skill links to what it relies on and never
  copies a doc's sections (DOCUMENTATION_GUIDELINES.md §1, Principle 8).

<!-- motion-kit:skills:start -->

## motion-kit skills and agents

Installed by `npx motion-kit skills install`. Each skill is `.agents/skills/<name>/SKILL.md`: read it
when a task matches its description, and follow it. Agents in `.agents/agents/` are role prompts.

Remotion's own skills (`npx skills add remotion-dev/skills`), if installed, cover Remotion's API. Where
they and these skills disagree on timing, look or sound, these skills and their studio rules win.

| Skill                                                                        | Use when                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apply-effect`](.agents/skills/apply-effect/SKILL.md)                       | Add a shader effect to a video — animated backgrounds (grainy gradients, ray-marched waves, clouds, pixel and dither fields), filters over footage or images (dither, halftone, pixel mosaic, duotone/gradient map, film grain), or Apple-style liquid-glass UI. Use when the user asks for a dithered, halftone, pixelated, retro, grainy, gradient, duotone or glass look, a background for a scene, or "apply this effect to my video".                                                                                                                                                                                                                                                                                                                                      |
| [`capture-brand`](.agents/skills/capture-brand/SKILL.md)                     | Capture a website's brand for video — colours, fonts, type scale, easing, components, logo and screenshots — then curate it into a video theme and a per-brand STYLE_GUIDE.md. Use when the user gives a product or company URL, asks to match a brand, or a film needs real screenshots, logo or colours from a site.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [`capture-reference-style`](.agents/skills/capture-reference-style/SKILL.md) | Study a reference video's visual grammar — palette, type, shot lengths and cuts, transitions, camera moves, texture and grain, how text enters and exits — from frames every 0.5 s and measured cuts, palette and grain, then write a style guide and a shot list for new content in that style, and wait for approval before any code. Use when the user supplies a reference video or frames and asks for a film "in this style", "like this", or to match a look.                                                                                                                                                                                                                                                                                                            |
| [`make-motion-film`](.agents/skills/make-motion-film/SKILL.md)               | Make a motion-graphics film from a brief, however short — "a 15-second video of <URL>" included — showreel, story, self-introduction, product film from real screenshots, product UI motion, or app UI in liquid glass. Plans every beat with a designed transition at every join, gets the user's approval on a storyboard before any code, builds pure functions of the beat to the showreel's bar in 16:9, 9:16 and 1:1 from one timeline, adds sound effects on every picture event (the user brings any music), passes three independent review rounds, and shows the user the contact sheet and an animatic before the full render. Use when the user asks for a motion graphics video, a showreel, a promo or launch film, an animated story, an intro, or UI animation. |
| [`render-and-deliver`](.agents/skills/render-and-deliver/SKILL.md)           | Render a finished motion-graphics film to MP4 and check it before handing it over — master render (H.264 yuv420p, CRF 16, AAC), verification of codec, loudness (−14 LUFS), true peak and bitrate, a smaller delivery copy for grainy films, a poster frame, a contact sheet and a loop check for looping films, and where to watch it with sound. Use when a film has passed review and the user wants the final video, an export, or a file to share.                                                                                                                                                                                                                                                                                                                         |
| [`review-film`](.agents/skills/review-film/SKILL.md)                         | Review a motion-graphics film before the full render — contact sheets (one frame per beat), offset sheets, strips across every join and fast action and a phone-size sheet, scored independently 1–10 on hook, phone readability, motion quality, variety, composition, depth, brand accuracy, sound sync and polish against the showreel's benchmark sheet, then fix the three worst problems and repeat, at least three rounds, until every score is 8+, logging each round; then the contact sheet and an animatic go to the user before the full render. Use before showing or rendering any film, when the user asks for feedback on a video, or to check work against the studio rules.                                                                                   |
| [`score-and-beats`](.agents/skills/score-and-beats/SKILL.md)                 | Design a film's sound in code — clicks, taps, pops, swishes, swooshes that peak on the frame a move arrives, thuds, impacts, risers and reverse cymbals — one effect on every picture event, mastered at −14 LUFS; mix them over the user's own music track, measuring its beats, downbeats and onsets so picture and effects land on what the ear hears. The kit never composes music. Use when a film needs sound design, SFX on cuts and UI actions, beat sync, or a supplied song loudness-matched and beat-mapped.                                                                                                                                                                                                                                                         |

| Agent                                                | Use when                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`brand-curator`](.agents/agents/brand-curator.md)   | Captures a website's brand and curates it into a video style guide — runs the capture, studies every screenshot and component crop, decides the accent, text colour and font roles, writes the curated rules, voice and components-to-animate sections, and returns a short summary. Use when a film needs a brand from a URL, so the screenshot-heavy review stays out of the main conversation.                                                                                                                                                                         |
| [`film-critic`](.agents/agents/film-critic.md)       | Independent reviewer for motion-graphics films — renders contact sheets, offset sheets, strips across every join and a phone-size sheet, scores the nine review criteria with frame evidence against the studio rules and the showreel's benchmark sheet, checks every sound cue against its picture event, and names the three worst problems with concrete fixes. Does not edit the film. Use for every review round before a full render (the author never scores their own film), or whenever a film needs a second opinion that is not anchored on how it was built. |
| [`scene-animator`](.agents/agents/scene-animator.md) | Builds one scene of a motion-graphics film from its rows of the beat plan — a component that is a pure function of the chapter's local beat, laid out for every format, on the measured beat grid — renders stills at its key beats, looks at them, fixes what is wrong, and returns the file and frames to check. Use to build a film's chapters in parallel, one agent per scene.                                                                                                                                                                                       |
| [`style-analyst`](.agents/agents/style-analyst.md)   | Studies a reference video's visual grammar and drafts a style guide and shot list from it — runs the frame and cut analysis, looks at the contact image and the frames around every cut and every frame with type, and writes STYLE_GUIDE.md and SHOTLIST.md for the user's subject, taking the reference's grammar and never its content. Use when a film should match a reference video, so the frame-by-frame study stays out of the main conversation.                                                                                                                |

<!-- motion-kit:skills:end -->
