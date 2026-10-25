# Layout across formats

One timeline renders at 16:9, 9:16 and 1:1. Scenes lay out from the frame, not from fixed pixels.

## `useLayout()`

From `motion-kit/lib/layout`:

| Field             | Holds                                                                       |
| ----------------- | --------------------------------------------------------------------------- |
| `width`, `height` | Frame size in px                                                            |
| `format`          | `"16:9"`, `"9:16"` or `"1:1"`                                               |
| `safe`            | `{ x, y, width, height }` in px: where text and key UI may go               |
| `unit`            | 1 at 1080 px on the frame's short side: size type and spacing as `n * unit` |
| `portrait`        | `true` for 9:16                                                             |

`FORMATS` gives each format's size: 1920 × 1080, 1080 × 1920, 1080 × 1080.

## Safe areas

`SAFE` holds fractions of the frame `[left, top, right, bottom]`:

| Format | Safe margins                                | Why                                                                                                     |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 16:9   | 5 % all round                               | Broadcast action-safe                                                                                   |
| 9:16   | 6 % left, 12 % top, 14 % right, 20 % bottom | Social-app overlays: account bar on top, action buttons on the right, caption and buttons at the bottom |
| 1:1    | 6 % all round                               | Feed crops                                                                                              |

The 9:16 margins are conservative estimates, not measured against each app; keep the hook's text
well inside them. Backgrounds and motion run full-bleed; only text, logos and UI you need read stay
inside `safe`.

## Rules

- **Type in units, from a minimum**: body copy at least 56 units, captions at least 40, headlines
  120 or more. 1 unit is 1 px at 1080 px short side, so text reads the same size on a phone in every
  format.
- **Reflow, don't scale**: in portrait, stack what sits side by side in landscape (a screenshot above
  its caption, not beside it); in 1:1, crop to the subject. Scaling a 16:9 layout down into 9:16 makes
  text unreadable.
- **One composition, branch on format**: `const { portrait } = useLayout();` then choose positions;
  timing never branches on format.
- **Real screenshots keep their aspect**: crop with `overflow: hidden` and position the crop; never
  stretch.
- **Check every format** on its own contact sheet before the render: a scene that works in 16:9 often
  collides with the 9:16 bottom safe area.
