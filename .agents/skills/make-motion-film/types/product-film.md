# Product film

A launch or promo for a real product, built from its real site: screenshots, logo, colours and fonts.
The product's UI is cropped and animated, never redrawn from imagination.

**A short request runs the whole recipe.** "Make a 15-second video of <URL>" is this playbook's
example prompt with the user's length: the showreel's energy ("go all out"), real assets listed
before animating, the five-part story, 9:16 then 1:1 and 16:9 — with two changes: sound is effects
only unless the user gives a track (R13), and the prompt's "show me a contact sheet before the full
render" becomes the two gates, the storyboard (R20) and the contact sheet with an animatic (R25).

## Inputs

| Input           | Required | Default                                                        |
| --------------- | -------- | -------------------------------------------------------------- |
| Product and URL | Yes      | —                                                              |
| Three features  | No       | Read them from the site; confirm with the user                 |
| Metric          | Yes      | Ask; a number the site states, with its source; never invented |
| CTA             | No       | The site's main call to action                                 |
| Length, formats | No       | 20 s; 9:16 first, then 1:1 and 16:9                            |
| Music track     | No       | Effects only; the user may supply one (R13)                    |

## Steps the playbook adds

1. **Capture the brand** (capture-brand skill): screenshots, component crops, logo, colours and fonts
   under `public/brands/<domain>/`. For screens the capture does not reach (a logged-in app, a
   specific page), ask the user for screenshots and put them in the same folder.
2. **List the assets** before animating: each screenshot and crop, what it shows, and the feature it
   will carry. For each UI the film assembles, measure the rectangles of its real elements (rows,
   cards, buttons, screens) on the image — `Assemble` lands one piece per element.
3. **Checkpoint** (R20): the asset list, the beat plan and the storyboard; wait for the OK.

## Structure

| Part     | Beats     | On screen                                                                                                                                                  | Join into the next                              |
| -------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Hook     | 1 (2–4 s) | The problem in five words of huge kinetic type, one word or phrase slamming per beat                                                                       | Iris or match into the product                  |
| Reveal   | 1         | The product appears; its UI assembles element by element (`Assemble` with real pieces)                                                                     | Dolly or container morph into the first feature |
| Features | 3         | Each a UI moment under the [UI motion rules](../references/ui-motion-rules.md): one container, a `Cursor` (or a tap on a touch device) doing a real action | Container morph between features                |
| Proof    | 1         | One number that proves it works, counting up with a hit per step                                                                                           | Converge or smash cut on an impact              |
| Lockup   | 1         | Logo and CTA, landing heavy with a shake on the impact                                                                                                     | —                                               |

- **Every join is designed** (R21) — the column above is the default; the storyboard names each one.
- **Something new on every beat or two** (R12): an element landing, a cursor press, a state change, a
  camera move. A headline over a still product for three beats is a dead beat.
- **The cursor does real actions**: clicks where a button is in the screenshot, types into a real
  field, hovers a real chart. Move it on springs between targets, click on beats. A `Cursor` path
  keyframe is when a move starts; it arrives about 0.35 s later, so key each move that much before
  its click.
- **Crops, not whole pages**: zoom into the part of the screenshot that shows the feature; full-page
  shots are unreadable at phone size.
- **Real copy**: headlines and labels from the site; the five-word hook may be written fresh but must
  match the product's claims.

## Look

The brand's style guide: its accent, its fonts (or the guide's substitutes), its radius. Neutral
grounds behind the screenshots; one accent for the cursor ring and highlights. **The brand's
restraint sets palette and type, not energy**: a quiet brand still gets a hook that slams, designed
joins, heavy springs on devices and lockups, and a hit on every impact — the showreel's bar (R12,
R21, R22).

## Sound

Effects on every picture event (R13): `click` on each cursor press, `swish` peaking as UI lands,
`swoosh` peaking as the product arrives and on moves between features, `tap` per count, an `impact`
with a picture hit on the lockup. Over the user's track if they give one: features on its downbeats,
UI sounds on its onsets.

## Checks

- Every UI pixel on screen comes from a capture or a user screenshot, and no image is cut along lines
  that are not in it.
- The metric came from the user or the site, with its source.
- Each format's contact sheet: screenshots stay readable and inside `safe`.
- Every join in the storyboard is in the film.

## Example prompt

Kept verbatim; this file is its home.

```text
Make a dynamic 20-second motion graphics video for [PRODUCT] ([URL]), with the energy
of a motion designer's showreel. Go all out.

Assets
- Visit the site. Use real screenshots (Playwright), the real logo, real colors and fonts.
  Save everything to ./assets and list what you found before you animate.
- Never redraw the product UI from imagination. Crop and animate the real thing.

Story (one beat each, 2 to 4 seconds)
1. Hook: the problem in 5 words of huge kinetic type.
2. The product appears, the UI assembles itself piece by piece.
3. Three features, each as a UI moment with a cursor doing a real action.
4. One number that proves it works: [METRIC].
5. Logo lockup + [CTA].

Sound
- Original music, 120 BPM, synthesized in code. UI clicks and whooshes on the beat.

Format: 1080x1920 (9:16) first, then 1:1 and 16:9 from the same timeline.
Before the full render, show me a contact sheet of one frame per beat.
```

The prompt's `./assets` is the brand capture's folder, `public/brands/<domain>/`: Remotion only
serves files under `public/`.
Its "Original music, 120 BPM, synthesized in code" predates R13: the kit answers it with effects on
the beat grid and asks the user for a track.
