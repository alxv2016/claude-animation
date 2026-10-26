# UI motion rules

How any product UI moves on screen, in every film type — a UI-motion film, the features of a product
film, an app in liquid glass, a UI moment inside a story or showreel (studio rule R26). They come from
the UI-motion example prompt, kept verbatim in [types/ui-motion.md](../types/ui-motion.md#example-prompt);
a request as short as "animate this for me, here's the URL" gets them in full.

## Contents

- [Inputs to ask for](#inputs-to-ask-for)
- [Direction](#direction)
- [Build](#build)
- [Gotchas](#gotchas)
- [Start](#start)

## Inputs to ask for

Ask for what the request does not give; propose from the site's capture and confirm the rest.

| Input                              | If the user has none                                                   |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Product and URL                    | — (required)                                                           |
| 8–12 UI states that tell its story | Propose them from the captured site; the user confirms                 |
| The real data shown in each state  | From the site's own copy, labels and numbers; never invented           |
| Brand colours, fonts, one accent   | capture-brand from the URL                                             |
| A royalty-free track near 120 BPM  | Effects only on the planned grid (R13); the user may add a track later |
| Formats                            | The playbook's default                                                 |

## Direction

- **One container never cuts**: every UI state is the same element changing size, radius and fill
  while its content swaps behind a short blur (`MorphBox`). In a film with several UI moments, each
  moment is one container; the join between moments is a container morph or another designed
  transition (R21), never a cut between two pieces of UI.
- **A cursor drives every change** (`Cursor`); on a touch device, a tap does. The pointer arrives
  before the change and presses on the beat the morph starts.
- **Something happens on every beat**; no dead time.
- **Springs with at most a tiny overshoot** (damping 26–30 at stiffness 170–220); none on text.
- **Warm neutral canvas, one accent** unless the brand's style guide says otherwise.
- **Banned**: bouncy easing, glows, gradients on UI chrome, particle bursts, dead time.
- **Liquid Glass dresses an element at its exact size and sits over it**: a glass bubble over an avatar
  is the avatar's circle, no padding, no shadow halo; the element is drawn into the backdrop the glass
  refracts (`LiquidGlass` `compose`), and the glass bends only its outer edge (`inward: 1`, a thin
  bevel) with a rim light and a gloss on top, so the face or content stays undistorted. Glass only over
  imagery, never over a flat colour.
- **Real pixels or real data**: show the captured screenshots inside the container, cropped to the
  element, or rebuild a component in the brand's own colours, fonts and radius with the site's real
  copy and numbers. Never UI from imagination.

## Build

| Rule                                                                                      | How in the kit                                                                                     |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| No CSS transitions, no timers, no carried state                                           | R1–R2; every value from `local`                                                                    |
| Closed-form springs; a value with many targets = one spring per change                    | `springKD`, `track`; `MorphBox` does this for every property                                       |
| Text inside a morphing container enters after the morph starts and leaves before the next | `swapAlpha`; `MorphBox` does this for `content`                                                    |
| Tab indicators: leading and trailing edges on different springs, so they stretch          | `indicator`                                                                                        |
| Beat grid from the track; start on a downbeat; UI sounds on measured peaks                | `score` with `track` measures `beats`, `downbeats` and `onsets`; without a track, the planned grid |
| Motion blur from subframes at 60 fps                                                      | `MotionBlur`, 8 samples (4 leaves ghosts)                                                          |
| A real screenshot that builds itself                                                      | `Assemble` with one piece per real element                                                         |

## Gotchas

- **Never `will-change`** on anything the camera scales: it rasterizes text, which then blurs.
- **A looping film ends where it starts**: the last frame equals the first, cursor position and
  velocity included; compare `still <id> 0` with the last frame.

## Start

The state list on the beat grid goes into the storyboard (R20): each state's beat, size, radius,
fill, content and real data, and the cursor or tap that triggers it. No code before the user approves
it.
