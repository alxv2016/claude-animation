# Storyboard

The storyboard is what the user approves before any scene code or sound, and again before every render
of a revision (studio rule R20): **three frames per scene** — start, middle and end — so the user sees
each scene's motion, not one moment of it, along with its copy, camera, join and sound. Every film has
one, however short the request.

## The file

`src/films/<slug>/storyboard.json`, rendered by `npx motion-kit storyboard src/films/<slug>` to
`out/storyboard-<slug>.png`.

| Key                            | Holds                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `title`, `logline`             | The film in one line: every later decision is checked against it                                             |
| `format`                       | The panel shape; defaults to the film's first format                                                         |
| `shots[]`                      | One per shot, in order                                                                                       |
| `shots[].chapter`              | The chapter name in `chapters.json`                                                                          |
| `shots[].beats`                | `[start, end]` in beats; the board prints the times from `beats.json`                                        |
| `shots[].images`               | Three frames (start, middle, end), paths under `public/`: the board lays them in a row with the notes beside |
| `shots[].image`                | One key frame instead, for a first plan before anything can be rendered                                      |
| `shots[].fit`, `focus`, `zoom` | `"contain"` or `"cover"`; the point to keep in view (`[x, y]`, 0–1); a zoom                                  |
| `shots[].copy`, `copyAt`       | The on-screen words of the key frame (`\n` for line breaks); `"top"` or `"bottom"`                           |
| `shots[].motion`               | What moves, on which beats, with which technique                                                             |
| `shots[].camera`               | The camera: push, dolly, zoom about a point, shake on impacts, or locked off                                 |
| `shots[].join`                 | The designed transition into the next shot (R21)                                                             |
| `shots[].sound`                | The effects and the picture events they sit on (R13)                                                         |

## Where the frames come from

- **First plan**: the real assets framed as the shot will frame them (`image`, or `images` cropped
  three ways). Choose `fit`, `focus` and `zoom` so the subject reads and the copy does not cover it.
- **Once the scenes exist, and for every revision**: stills of the scenes themselves, so the board
  shows what will render —
  `npx motion-kit sheet <id> --frames <f1,f2,…> --width 360 --out out/board-frames.png`, then copy
  `out/.sheet/<id>/<frame>.jpg` to `public/<slug>/board/` and list them in `images`. Frames near each
  scene's start, middle and end; for a scene that moves the camera, the middle frame after the move.

## What each panel must answer

- **What the shot shows**: real frames, not placeholders — the product whole (R27), the type readable
  and off the product's UI (R28).
- **Something new on every beat or two** (R12): the motion line names the beats.
- **How it joins the next shot** (R21): a cut on the beat between moving shots, a match, or the
  footage's own motion — named, and never a zoom into one screen and out of another.
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
   board is shown again — with frames from the edited scenes — before anything is rendered.

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
      "join": "Cut on beat 4, onto the window already moving",
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
