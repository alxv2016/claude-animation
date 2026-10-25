# Brand capture: files and fields

## Output folders

| Path                                      | Holds                                                         | Git                      |
| ----------------------------------------- | ------------------------------------------------------------- | ------------------------ |
| `public/brands/<domain>/brand.json`       | Everything captured (below)                                   | Commit                   |
| `public/brands/<domain>/overrides.json`   | Curated choices (below)                                       | Commit; hand-edited      |
| `public/brands/<domain>/video-theme.json` | Derived theme (below)                                         | Commit; generated        |
| `public/brands/<domain>/screenshots/`     | `desktop-1440x900.png`, `mobile-390x844.png`, `full-page.png` | Commit                   |
| `public/brands/<domain>/components/`      | `<kind>-<n>.png` crops                                        | Commit                   |
| `public/brands/<domain>/logo.svg`         | Logo when it is an inline SVG                                 | Commit                   |
| `public/brands/<domain>/images/`          | Icons, `og:image`                                             | Commit                   |
| `public/brands/<domain>/fonts/`           | Captured font files                                           | **Ignored** (licences)   |
| `docs/brands/<domain>/STYLE_GUIDE.md`     | The brand's video style guide                                 | Commit; partly generated |

Captures live under `public/` because Remotion's `staticFile()` only reads `public/`: screenshots and
crops drop straight into scenes as `staticFile("brands/<domain>/screenshots/desktop-1440x900.png")`.

## `brand.json` fields

| Field                                    | Holds                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `url`, `domain`, `capturedAt`, `capture` | Source, time, browser version, viewports, duration, log of dismissals and fetches                       |
| `meta`                                   | Title, description, `og:image`, `theme-color`, icons, first 8 `h1`/`h2` headlines                       |
| `palette`                                | `pageBackground`, `backgroundByArea`, `textByLength`, `neutrals`, `accentCandidates`                    |
| `colorTokens`                            | Colour custom properties: `name`, `hex`, `alpha`                                                        |
| `typography`                             | Per element: `family`, `stack`, `size` (px), `weight`, `lineHeight`, `letterSpacing`, `color`, `sample` |
| `fonts`                                  | Families by text length, loaded faces, `@font-face` rules, downloaded `files`                           |
| `motion`                                 | `easingTokens`, `durationTokens`, `usedDurations`, `usedEasings`, `keyframes`                           |
| `shape`                                  | `radius` and `shadow` tallies                                                                           |
| `components`                             | `kind`, `file`, `box`, computed `style` and text                                                        |
| `logo`, `images`, `screenshots`          | Paths relative to the brand folder                                                                      |
| `cssVars`                                | Every custom property on `:root`/`html`, resolved                                                       |

## `overrides.json` keys

| Key          | Overrides                               | Example                       |
| ------------ | --------------------------------------- | ----------------------------- |
| `name`       | Brand name in the guide title           | `"Anthropic"`                 |
| `accent`     | Accent colour                           | `"#d97757"`                   |
| `background` | Background colour                       | `"#faf9f5"`                   |
| `text`       | Text colour                             | `"#141413"`                   |
| `fonts`      | `{ display, text, mono }` family names  | `{ "mono": "anthropicMono" }` |
| `bpm`        | Tempo for converting durations to beats | `128` (default)               |

## Video theme

`video-theme.json` is the derived, import-ready subset of a brand for scenes.

| Field       | Derivation                                                                                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `colors`    | `background`, `text`, `accent` (override, else top candidate), `neutrals`, opaque colour `tokens`                                                                                               |
| `fonts`     | `display` = `h1` family, `text` = `p` family, `mono` = `code` family or a captured "mono" face; each with captured `files` and a `googleFont` name when `@remotion/google-fonts` has the family |
| `type`      | Web sizes × `56 / body size` (px at 1920 × 1080), so body text lands on the 56 px phone-readable minimum                                                                                        |
| `easing`    | Easing tokens and used curves as `[x1, y1, x2, y2]`; CSS keywords map to their curves (`ease` = 0.25, 0.1, 0.25, 1)                                                                             |
| `durations` | Used transition durations in ms and in beats at `bpm`                                                                                                                                           |
| `radius`    | Radius values by use                                                                                                                                                                            |

```tsx
import theme from "../public/brands/<domain>/video-theme.json"; // path relative to the scene file
import {
  brandEasing,
  loadBrandFonts,
  type VideoTheme,
} from "./motion-kit/brand/theme";

const brand = theme as VideoTheme;
loadBrandFonts(brand); // captured files; licence first
const ease = brandEasing(brand, "--ease-out-quart"); // any name in brand.easing
```

- **Easing points are `number[]`, not tuples** — JSON imports widen tuples; `brandEasing` checks for
  four values and throws, listing the available names, when the token is missing.
