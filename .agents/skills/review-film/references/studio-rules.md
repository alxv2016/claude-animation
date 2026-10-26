# Studio rules

The rules every film made with motion-kit follows, unless the brief says otherwise. Cite them by ID
(R1–R26) in reviews and docs; this file is their home. IDs are stable: new rules take new numbers.

| ID  | Group       | Rule                                                                                                                                                                                                                |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Render      | Every film is a pure function of time: each frame is computed from the frame number alone (in a plain-HTML film, `window.seek(t)` paints frame `t`)                                                                 |
| R2  | Render      | No CSS transitions, no `setTimeout`, no `requestAnimationFrame` in render mode, no state carried between frames                                                                                                     |
| R3  | Render      | Seeded noise only (mulberry32 or a coordinate hash), never `Math.random`                                                                                                                                            |
| R4  | Render      | Render through the kit (`npx motion-kit render`); encode H.264 `yuv420p`, CRF 16                                                                                                                                    |
| R5  | Look        | Banned default: centred title on a gradient                                                                                                                                                                         |
| R6  | Look        | Banned default: everything fading in                                                                                                                                                                                |
| R7  | Look        | Banned default: corner labels and frame borders                                                                                                                                                                     |
| R8  | Look        | Banned default: glow on UI chrome                                                                                                                                                                                   |
| R9  | Look        | Banned default: generic particle bursts                                                                                                                                                                             |
| R10 | Look        | One display face, one UI face                                                                                                                                                                                       |
| R11 | Look        | One accent colour, unless the brief says otherwise                                                                                                                                                                  |
| R12 | Look        | Something new happens on screen on every beat or two — never more than 2 s without a change, and no dead beats (an end card may hold)                                                                               |
| R13 | Sound       | Sound is sound design: effects synthesized in code, each on a picture event. The kit never composes music; background music is the user's supplied track, mixed under the effects                                   |
| R14 | Sound       | Place hits on the beat grid (`beats.json`): measured from the user's track, or the planned grid the effects are placed on                                                                                           |
| R15 | Sound       | Loudness −14 LUFS                                                                                                                                                                                                   |
| R16 | Review loop | Before showing anything, render one frame per beat as a contact sheet and look at it                                                                                                                                |
| R17 | Review loop | Score it 1–10 on hook in the first 2 s, readability at phone size, motion quality, variety, composition, depth, brand accuracy, sound sync and polish                                                               |
| R18 | Review loop | Bring the review to the user before fixing anything: the scorecard and the three worst problems with proposed fixes; fix what the user picks — never loop on fixes alone                                            |
| R19 | Review loop | Full render only after the user approves                                                                                                                                                                            |
| R20 | Gate        | Storyboard first: the user approves the storyboard (one panel per shot: key frame, copy, motion, join, sound) before any scene code or sound is written                                                             |
| R21 | Look        | Every scene join is a designed transition: match cut, iris, blinds, continuity morph, dolly, converge, container morph, or a smash cut on an impact with shake — never an unhidden hard cut or a crossfade          |
| R22 | Look        | Motion has weight: big moves anticipate and settle on springs chosen by role (a tiny overshoot on UI, none on text being read), and every impact the ear hears has a picture hit (shake, wobble, flash)             |
| R23 | Review loop | The review is independent: the `film-critic` agent, or a session that did not build the film, scores it; the author never scores their own film                                                                     |
| R24 | Review loop | One independent review per pass, its scorecard logged in the film's `review_log.md`; another pass only when the user asks for one                                                                                   |
| R25 | Gate        | After the review, the user sees the scorecard, the three worst problems and the animatic (`npx motion-kit render <id> --animatic`) and decides: fix, review again, or ship                                          |
| R26 | Look        | Any product UI on screen follows the UI motion rules (make-motion-film skill, `references/ui-motion-rules.md`): one container that never cuts, a cursor or tap driving every change on a beat, real states and data |

## Why

- **R1–R3**: renderers draw frames out of order, in parallel, and at fractional times for motion
  blur; anything carried between frames renders differently run to run and cannot be scrubbed.
- **R5–R9**: these are the giveaways of generic AI-made video; avoiding them is most of looking
  designed.
- **R12, R21, R22**: the showreel's bar (`docs/MOTION_REEL.md` §6, §9, §10 in the kit's repo; the
  benchmark sheet beside this file). A film can avoid every banned look and still read as cheap: a
  hold of a few beats, a cut nothing hides, or a move that slides in with no weight is what separates
  it from the reel. A restrained brand limits palette and type, not these.
- **R26**: UI that cuts between states or changes on its own reads as a slideshow of screenshots; one
  container morphing under a pointer reads as a product being used.
- **R13**: synthesized melodies sound like stock music; sound effects synced to the picture are what
  make motion feel physical, and the user chooses the music.
- **R16–R19, R23–R24**: stills catch problems before a full render costs minutes; scoring against
  fixed criteria stops "looks fine" from passing a weak film; an author grading their own film scores
  what the code meant, not what the frames show. One review, then the user: the goal is to get the
  film in front of them for input, not to converge alone — a 2026-10 test looped four rounds (~25 min
  each) while scores crept 6.0 → 6.4, and some limits were the assets'. The user judges what is worth
  fixing.
- **R20, R25**: the user decides what the film is before effort goes into it, and sees the film in
  motion before the full render — the two points where a change is cheap.
