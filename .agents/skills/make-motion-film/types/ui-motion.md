# UI motion

Product-film UI motion: one container that never cuts. Every state is the same element changing
size, radius and fill while its content swaps behind a short blur, and a cursor drives every change.
"Animate this, here's the URL" with UI to show is this type, or a product film whose UI moments
follow the same rules.

## Inputs

| Input                            | Required | Default                                                              |
| -------------------------------- | -------- | -------------------------------------------------------------------- |
| Product and URL                  | Yes      | —                                                                    |
| 8–12 UI states with real data    | Yes      | — (propose from the site; confirm)                                   |
| Brand colours, fonts, one accent | No       | capture-brand from the URL                                           |
| Track                            | No       | The user's royalty-free track near 120 BPM; effects only without one |
| Formats                          | No       | 16:9                                                                 |

## Steps the playbook adds

1. **Ask for the inputs** above that the request does not give; propose the states from the
   captured site and confirm them.
2. **The state list on the beat grid** in `brief.md` and the storyboard: each state's beat, size,
   radius, fill, content and real data, and the cursor action that triggers it.
3. **Checkpoint** (R20): show the storyboard and state list; wait for the OK before any code.

## Structure

120 BPM, 8 bars, something on every beat. A typical chain:

logo → CTA button → email field (typed) → loader → success check → dashboard card → chart draws
itself → tooltip on hover → ⌘K palette → toast → logo.

- **One `MorphBox`** carries the whole film: its `states` are the state list.
- **The cursor arrives before each change** and clicks on the beat the morph starts: key its move
  at least 0.35 s before the click (a `Cursor` keyframe is when the move starts).
- **Loop**: the last state equals the first — position, size and the cursor's position and velocity
  — so the film loops. Use `loopT` for anything that cycles.

## Look and build

The [UI motion rules](../references/ui-motion-rules.md) — direction, build rules and gotchas — are
this film's whole look and build, and they apply to UI in every other film type too (R26). Warm
neutral canvas and one accent unless a brand's style guide says otherwise.

## Sound

A `click` on every cursor press, a `swish` peaking as each state arrives, a `pop` on the success
check; over the user's track if there is one, with UI sounds on its measured onsets (R13).

## Checks

- Strip across every state change: text never rides a moving edge.
- First and last frames match.

## Example prompt

Kept verbatim; this file is its home.

```text
<inputs>
Ask me for: my product + URL, 8 to 12 UI states that tell its story, the real data shown in
each state, brand colors + fonts + one accent, a royalty-free track near 120 BPM, formats.
</inputs>

<direction>
Product-film UI motion. One container never cuts: every state is the same element changing
size, radius and fill while its content swaps behind a short blur. A cursor drives every change.
Warm neutral canvas, one accent. Springs with at most a tiny overshoot.
Banned: bouncy easing, glows, gradients on UI chrome, particle bursts, dead time.
</direction>

<structure>
120 BPM, 8 bars, something happens on every beat.
logo → CTA button → email field (typed) → loader → success check → dashboard card
→ chart draws itself → tooltip on hover → ⌘K palette → toast → logo.
</structure>

<build>
1. One HTML file, one canvas, window.seek(t). No CSS transitions, no timers, no carried state.
2. Closed-form springs. A value with many targets = sum of one spring per change.
3. Text inside a morphing container enters after the morph starts, leaves before the next one.
4. Tab indicators: leading and trailing edges on different springs so they stretch.
5. Beat grid from the track (numpy/librosa). Start on a downbeat. UI sounds on measured peaks.
6. Render in headless Chrome at 60 fps, 4 subframes per frame, blended for motion blur.
</build>

<gotchas>
Never use will-change on anything the camera scales (blurry text).
The last frame must equal the first, cursor position and velocity included.
</gotchas>

<start>
Ask for the inputs, then show me the state list on the beat grid before writing code.
</start>
```

The prompt's "one HTML file, `window.seek(t)`" is met by a Remotion composition: each frame is a pure
function of the frame number, which is what `seek` asks for. The beat grid is measured in JS
(`npx motion-kit beats`) rather than numpy/librosa.
