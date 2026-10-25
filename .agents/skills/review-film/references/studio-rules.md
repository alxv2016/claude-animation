# Studio rules

The rules every film made with motion-kit follows, unless the brief says otherwise. Cite them by ID
(R1–R19) in reviews and docs; this file is their home.

| ID  | Group       | Rule                                                                                                                                                |
| --- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Render      | Every film is a pure function of time: each frame is computed from the frame number alone (in a plain-HTML film, `window.seek(t)` paints frame `t`) |
| R2  | Render      | No CSS transitions, no `setTimeout`, no `requestAnimationFrame` in render mode, no state carried between frames                                     |
| R3  | Render      | Seeded noise only (mulberry32 or a coordinate hash), never `Math.random`                                                                            |
| R4  | Render      | Render through the kit (`npx motion-kit render`); encode H.264 `yuv420p`, CRF 16                                                                    |
| R5  | Look        | Banned default: centred title on a gradient                                                                                                         |
| R6  | Look        | Banned default: everything fading in                                                                                                                |
| R7  | Look        | Banned default: corner labels and frame borders                                                                                                     |
| R8  | Look        | Banned default: glow on UI chrome                                                                                                                   |
| R9  | Look        | Banned default: generic particle bursts                                                                                                             |
| R10 | Look        | One display face, one UI face                                                                                                                       |
| R11 | Look        | One accent colour, unless the brief says otherwise                                                                                                  |
| R12 | Look        | Something new happens on screen every 2 to 4 s                                                                                                      |
| R13 | Sound       | Score and SFX are synthesized in code, unless a track is supplied                                                                                   |
| R14 | Sound       | Place hits on the measured beat grid (`beats.json`)                                                                                                 |
| R15 | Sound       | Loudness −14 LUFS                                                                                                                                   |
| R16 | Review loop | Before showing anything, render one frame per beat as a contact sheet and look at it                                                                |
| R17 | Review loop | Score it 1–10 on hook in the first 2 s, readability at phone size, motion quality, variety, brand accuracy and sound sync                           |
| R18 | Review loop | Fix the 3 worst problems; repeat until every score is 8 or more                                                                                     |
| R19 | Review loop | Only then do the full render                                                                                                                        |

## Why

- **R1–R3**: renderers draw frames out of order, in parallel, and at fractional times for motion
  blur; anything carried between frames renders differently run to run and cannot be scrubbed.
- **R5–R9**: these are the giveaways of generic AI-made video; avoiding them is most of looking
  designed.
- **R16–R19**: stills catch problems before a full render costs minutes, and scoring against fixed
  criteria stops "looks fine" from passing a weak film.
