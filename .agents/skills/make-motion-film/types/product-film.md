# Product film

A launch or promo for a real product, built from its real site: screenshots, logo, colours and fonts.
The product's UI is cropped and animated, never redrawn from imagination.

## Inputs

| Input           | Required | Default                                        |
| --------------- | -------- | ---------------------------------------------- |
| Product and URL | Yes      | —                                              |
| Three features  | No       | Read them from the site; confirm with the user |
| Metric          | Yes      | — (ask; never invent a number)                 |
| CTA             | No       | The site's main call to action                 |
| Length, formats | No       | 20 s; 9:16 first, then 1:1 and 16:9            |

## Steps the playbook adds

1. **Capture the brand** (capture-brand skill): screenshots, component crops, logo, colours and fonts
   under `public/brands/<domain>/`. For screens the capture does not reach (a logged-in app, a
   specific page), ask the user for screenshots and put them in the same folder.
2. **List the assets** before animating: each screenshot and crop, what it shows, and the feature it
   will carry. Show the list with the beat plan.
3. **Checkpoint**: the asset list and the beat plan; wait for the OK.

## Structure

| Part     | Beats     | On screen                                                                   |
| -------- | --------- | --------------------------------------------------------------------------- |
| Hook     | 1 (2–4 s) | The problem in five words of huge kinetic type                              |
| Reveal   | 1         | The product appears; the UI assembles itself piece by piece (`Assemble`)    |
| Features | 3         | Each a UI moment: a crop of the real screen, a `Cursor` doing a real action |
| Proof    | 1         | One number that proves it works, counting up                                |
| Lockup   | 1         | Logo and CTA                                                                |

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
grounds behind the screenshots; one accent for the cursor ring and highlights.

## Sound

Synthesized at the brief's BPM (120 by default): a groove under, UI clicks (`tick`) on cursor clicks,
whooshes on moves between features, an impact on the lockup.

## Checks

- Every UI pixel on screen comes from a capture or a user screenshot.
- The metric came from the user or the site, with its source.
- Each format's contact sheet: screenshots stay readable and inside `safe`.

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
