# Techniques and helpers

The motion vocabulary for scenes, each as a closed form so any frame can be computed alone (R1).
Helpers live in the kit's library (`motion-kit/lib/math`, `motion-kit/effects`); the showreel in the
kit's repo (`docs/MOTION_REEL.md` §7–§12) shows every one in use with exact numbers.

## Contents

- [Helpers](#helpers)
- [UI components](#ui-components)
- [Techniques](#techniques)
- [Transitions](#transitions)
- [Camera](#camera)
- [Picking a technique per beat](#picking-a-technique-per-beat)

## Helpers

`motion-kit/lib/math`. Times in seconds; convert beats with `clock.sec(beats)`.

| Helper                                                                                            | Does                                                                                                        |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `springKD(dt, stiffness = 170, damping = 26)`                                                     | Spring step 0 → 1 (react-spring units); 0 for `dt ≤ 0`. 170/26 barely overshoots; 260/18 overshoots clearly |
| `spring(dt, freq = 2.2, damping = 0.45)`                                                          | The same in Hz and damping ratio; ratio ≥ 1 never overshoots                                                |
| `track(t, [[t, v], …], k, d)`                                                                     | A value with several targets: one spring per change, summed                                                 |
| `indicator(t, stops, width, lead, trail)`                                                         | Stretching indicator: edges on different springs, `{ left, right }`                                         |
| `swapAlpha(t, tIn, tOut)`                                                                         | Opacity for text in a morphing container: in after the morph starts, out before the next                    |
| `wobble(dt, decay = 0.15, freq = 5)`                                                              | Decaying oscillation from 1, for hit reactions                                                              |
| `loopT(t, dur)`                                                                                   | Wraps time for a seamless loop (the last frame must also equal the first)                                   |
| `easeOutExpo`, `easeInOutCubic`, `easeOutBack(u, s)`, `easeInBack`, `cubicBezier(x1, y1, x2, y2)` | Easing curves for timed moves; `cubicBezier` takes a brand's CSS curves                                     |
| `prog(x, a, b)`, `clamp`, `lerp`                                                                  | Progress 0–1 of `x` through `[a, b]`, clamped                                                               |
| `hash(i, seed)`, `noise1(x, seed)`, `mulberry32(seed)`                                            | Seeded randomness: never `Math.random` (R3)                                                                 |
| `mixHex(a, b, u)`                                                                                 | Blends two hex colours                                                                                      |

## UI components

`motion-kit/effects`. Each takes `time` (seconds) or reads the frame.

| Component               | Use                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `Cursor`                | Scripted pointer: `path` keyframes `[t, x, y]` on springs, `clicks` with press and ring, leans into motion                  |
| `Assemble`              | A real screenshot that builds itself from tiles springing in, staggered from an `origin`                                    |
| `MorphBox`              | One container that never cuts: `states` `{ at, x, y, width, height, radius, fill, content }`, content swapped behind a blur |
| `LiquidGlass`           | Refracting glass panels over a backdrop (apply-effect skill)                                                                |
| Backgrounds and filters | `Gradient`, `GradientWaves`, `Sky`, `Dither`, `PixelField`, `GradientMap` (apply-effect skill)                              |

## Techniques

| Technique            | Recipe                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Masked rise          | Text in an `overflow: hidden` box translates from 100 % to 0 on a spring or `easeOutExpo`; letters staggered 0.02–0.05 beat |
| Typing               | `text.slice(0, floor((b − start) / perChar))`, 0.05 beat per character; a block cursor blinking on quarter beats            |
| Squash and stretch   | Stretch along velocity (`1 + clamp(speed / 5000, 0, 0.5)`, `1 / stretch` across); squash on contact; area stays constant    |
| Arcs                 | `y = lerp(y0, y1, u) − 4h·u(1 − u)` with `x` linear in `u`                                                                  |
| Anticipation         | A small move against the direction (≈ 5–8 %) in the quarter beat before the hit; overshoot after                            |
| Beat-locked stepping | Hold, then `easeOutExpo` across the first 40 % of each beat: motion that reads as rhythm                                    |
| Stagger              | Same motion offset per element, ordered by index, row, or distance from a source                                            |
| Field ripple         | Every property of every cell from its distance to a source: a Gaussian ring `e^(−((d − v·age) / w)²)`, decaying with age    |
| Line draw            | SVG `strokeDasharray = drawn, total`; recompute lengths every frame if the points move                                      |
| Counting number      | `easeOutExpo` from 0 to the value over 1–2 beats; tabular figures so it does not jitter                                     |
| Shape morph          | Both shapes as radius functions `r(θ)` sampled at the same 180 angles; blend radii                                          |
| Hit reaction         | `wobble` on scale or colour flash on the thing hit, on the beat                                                             |
| Kinetic type         | One word per beat, slamming from 1.3× to 1× in 0.2 beat                                                                     |
| CSS 3D               | `perspective` on a wrapper, `preserve-3d`, faces with `backface-visibility: hidden`                                         |

## Transitions

Hide every join with motion, a match or a beat; never a crossfade by default.

| Transition       | How                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------- |
| Match cut        | The last shape of one scene is the first of the next (a ball becomes the next ground) |
| Iris             | `clip-path: circle()` growing from a point the camera holds still                     |
| Blinds           | Bands slide off along their own directions, staggered                                 |
| Continuity morph | Elements of one scene reshape into the next scene's elements                          |
| Smash cut        | A hard cut on an impact, with camera shake                                            |
| Dolly in         | Scale a surface up until it fills the frame, then cut to it                           |
| Converge         | Everything flies to one point, which becomes the next scene's seed                    |
| Container morph  | `MorphBox`: the same element changes size, radius and fill                            |

## Camera

The camera is a transform on a wrapper.

- **Zoom about a point**: `translate(p) scale(z) translate(−p)` keeps `p` fixed on screen.
- **Impact shake**: `A · e^(−Δt / 0.09 s)` with `noise1` per axis, and scale by `1 + shake / 600` so
  the frame edge never shows.
- **Push**: a slow scale to 1.05–1.12× across a build.
- **Motion blur**: the kit's `MotionBlur`, 8 samples, 180° shutter, only when rendering (the film
  template does this). Not Remotion's `CameraMotionBlur`: it snaps every colour to a multiple of 8
  at 8 samples, so shadows and gradients band and flat colours shift. 10 samples crashed Chrome on
  heavy frames.
- **Never `will-change`** on anything the camera scales: it rasterizes text, which then blurs.

## Picking a technique per beat

- **A different technique each scene** (R12, and the showreel's "every shot is a different
  technique"): list the techniques in the beat plan's Technique column and check for repeats.
- **Every entry has a technique**, never a plain fade (R6): masked rise, typing, scale spring,
  draw-on, iris or assemble.
- **Motion carries meaning**: a spring with overshoot reads playful, a critically damped spring reads
  precise, stepping reads rhythmic. Match the brief's voice; product UI wants at most a tiny overshoot.
