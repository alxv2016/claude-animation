# App UI glass

iOS-style app UI in liquid glass: floating tab bars, selection lenses, widgets and buttons that merge,
refracting a detailed wallpaper behind them. Usually 9:16 (a phone screen) or 16:9 (a UI close-up).

## Inputs

| Input             | Required | Default                                       |
| ----------------- | -------- | --------------------------------------------- |
| What the UI shows | No       | A tab bar and a home screen of widgets        |
| Wallpaper         | No       | `Sky` (clouds); an image or video if supplied |
| Brand             | No       | Neutral; an app's brand via capture-brand     |
| Format            | No       | 9:16                                          |

## Structure

| Part     | Share | On screen                                                                            |
| -------- | ----- | ------------------------------------------------------------------------------------ |
| Hook     | 0–2 s | The glass already moving over the wallpaper: a lens sliding, buttons merging         |
| Patterns | ~75 % | One glass pattern per bar: tab selection, merge and part, widget stack, sheet rising |
| Settle   | 2 s   | The UI at rest; the wallpaper keeps moving under it                                  |

## Look

- **The backdrop must have detail**: glass shows nothing over a flat colour. `Sky`, a photo or video.
- **Crisp content on top**: DOM text and SVG icons over the glass, never inside the shader.
- **The glass patterns** — tab-bar selection lens, merging buttons, widgets, the floating tab bar —
  and their settings are in the apply-effect skill's catalogue (`references/catalog.md`, "iOS
  patterns"). Start from those numbers.
- **Springs, not easings**: the lens on `indicator()` (leading edge on a stiffer spring than the trailing one), merges on a
  spring of the gap to 0.

## Sound

Soft and tactile: `tick` on each tap, a low `pluck` on merges, a quiet pad. No impact hits.

## Checks

- Full-size stills of the glass (`npx motion-kit still <id> <frame>`): the rim bends the backdrop and
  the text on top is sharp. Contact sheets are too small to judge glass.
- No glow on the chrome (R8); the only light is the glass's own rim highlight.

## Example brief

No user prompt yet; this is the brief the kit's `LiquidGlassTabBar` and `LiquidGlassDemo`
compositions answer, written here as a starting point.

```text
make a 12-second 9:16 film of an iOS home screen in liquid glass over moving clouds:
a floating tab bar whose selection lens stretches between tabs, two buttons that melt
into one and part, and a stack of widgets settling in. Crisp labels, no glow.
```
