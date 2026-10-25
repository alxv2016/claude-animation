# Storyboard

The storyboard is what the user approves before any scene code or sound (studio rule R20): one panel
per shot, so the user sees the film's story, look, transitions and sound before effort goes into it.
Every film has one, however short the request.

## The file

`src/films/<slug>/storyboard.json`, rendered by `npx motion-kit storyboard src/films/<slug>` to
`out/storyboard-<slug>.png`.

| Key                            | Holds                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `title`, `logline`             | The film in one line: every later decision is checked against it                   |
| `format`                       | The panel shape; defaults to the film's first format                               |
| `shots[]`                      | One per shot, in order                                                             |
| `shots[].chapter`              | The chapter name in `chapters.json`                                                |
| `shots[].beats`                | `[start, end]` in beats; the board prints the times from `beats.json`              |
| `shots[].image`                | The key frame's real asset, a path under `public/` (a screenshot, a crop, a photo) |
| `shots[].fit`, `focus`, `zoom` | `"contain"` or `"cover"`; the point to keep in view (`[x, y]`, 0–1); a zoom        |
| `shots[].copy`, `copyAt`       | The on-screen words of the key frame (`\n` for line breaks); `"top"` or `"bottom"` |
| `shots[].motion`               | What moves, on which beats, with which technique                                   |
| `shots[].camera`               | The camera: push, dolly, zoom about a point, shake on impacts, or locked off       |
| `shots[].join`                 | The designed transition into the next shot (R21)                                   |
| `shots[].sound`                | The effects and the picture events they sit on (R13)                               |

## What each panel must answer

- **What the shot shows**: the key frame is the real asset framed as the shot will frame it — not a
  placeholder. Choose `fit`, `focus` and `zoom` so the subject reads and the copy does not cover it.
- **Something new on every beat or two** (R12): the motion line names the beats.
- **How it joins the next shot** (R21): a named transition; "cut" alone is not a join.
- **What the ear hears and when** (R13, R22): every impact names its picture hit.
- **UI shots** list their states on the beat grid ([ui-motion-rules.md](ui-motion-rules.md#start)).

## The checkpoint

1. Write `storyboard.json` from the beat plan in `brief.md`.
2. `npx motion-kit storyboard src/films/<slug>`, open `out/storyboard-<slug>.png` and look at it: a
   panel whose key frame is empty, cropped wrong or covered by its copy is fixed before the user
   sees it.
3. Show the user the board, the asset list and, if there is no music track, say the film will have
   effects only and they may supply a track.
4. **Wait for the user's approval.** Changes go back into `brief.md` and `storyboard.json`, and the
   board is shown again.

## Example

```json
{
  "title": "Launch",
  "logline": "The app turns a messy inbox into one calm list in 15 seconds.",
  "format": "9:16",
  "shots": [
    {
      "chapter": "Hook",
      "beats": [0, 4],
      "copy": "Your inbox.\nOn fire.",
      "motion": "One word per beat slams 1.3× → 1×; the last word shakes on beat 3",
      "join": "Iris: the period opens into the app's window on beat 4",
      "sound": "thud per slam, impact on beat 4"
    },
    {
      "chapter": "Reveal",
      "beats": [4, 8],
      "image": "brands/example.com/screenshots/desktop-1440x900.png",
      "fit": "cover",
      "focus": [0.3, 0.2],
      "motion": "The window lands; the sidebar, list and reader assemble element by element from beat 5",
      "join": "Container morph: the reader pane becomes the first UI state",
      "sound": "swoosh peaking as the window lands, click per element"
    }
  ]
}
```
