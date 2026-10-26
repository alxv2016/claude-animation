# Effects: catalogue

Every effect, its props and defaults, and which one answers a request. Import from the vendored
library (`src/motion-kit/effects`, path relative to your file).

## Task lookup

| The user asks for…                             | Use                                        | Start from                                                                                                                       |
| ---------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| A dithering effect on their video              | `Dither` with `source={{ video }}`         | `mode="bayer8"`, `pixelSize={3}`, a 2–4 colour `palette`                                                                         |
| A 1-bit / Game Boy / retro look                | `Dither`                                   | `palette` of 2 or 4 colours, `mode="bayer4"`, `pixelSize={4}`                                                                    |
| Newspaper or comic halftone                    | `Dither`                                   | `mode="halftone"`, `pixelSize={8}`, `angle={45}`, palette ink + paper                                                            |
| Engraving / hatching                           | `Dither`                                   | `mode="lines"` or `"crosshatch"`, `pixelSize={6}`                                                                                |
| A grainy gradient background                   | `Gradient`                                 | `type="mesh"`, 3–4 brand colours, `grain={0.06}`                                                                                 |
| A silky or flowing gradient                    | `Gradient`                                 | `type="linear"`, `bands={3}`, `silk={0.8}`, `warp={0.8}`                                                                         |
| Hard-edged colour blocks that drift            | `Gradient`                                 | `type="conic"` or `"linear"`, `softness={0.15}`                                                                                  |
| A 3D wave / ocean / landscape gradient         | `GradientWaves`                            | defaults; set the four colours                                                                                                   |
| A sky with drifting clouds                     | `Sky`                                      | `cover={0.55}`, `sharpness={0.6}`                                                                                                |
| Pixel, LED or dot-matrix background            | `PixelField`                               | `shape="circle"`, `background`, `cellSize={14}`                                                                                  |
| Dither / pixelate / duotone a whole video file | `npx motion-kit filter`                    | [Filter a whole video](#filter-a-whole-video)                                                                                    |
| Pixels that pulse on the beat                  | `PixelField` or `Dither` with `ripples`    | [Ripples](#ripples-and-beat-sync)                                                                                                |
| Mosaic / pixelated footage                     | `PixelField` with `source`, `sourceColor`  | `shape="square"`, `cellSize={12}`                                                                                                |
| Duotone, tritone or brand-tinted footage       | `GradientMap`                              | 2–3 `colors`, `grain={0.06}`                                                                                                     |
| Film grain on footage                          | `GradientMap`                              | `amount={0}` (original colours) and `grain`                                                                                      |
| Apple Liquid Glass / iOS UI animation          | `LiquidGlass`                              | [iOS patterns](#ios-patterns)                                                                                                    |
| A floating glass tab bar                       | `LiquidGlass` + a stretching lens panel    | [iOS patterns](#ios-patterns)                                                                                                    |
| Glass over an animated effect                  | `LiquidGlass` with `backdrop={{ shader }}` | `{ fragment: SKY_FRAGMENT, uniforms: skyUniforms({}) }`                                                                          |
| Frosted-glass cards over a photo or gradient   | `LiquidGlass`                              | `glass={{ frost: 8 }}`                                                                                                           |
| Glass over a product photo placed in the scene | `LiquidGlass` with `placement`             | `backdrop={{ image }}`, `placement={{ x, y, width, height, ground }}`: the backdrop sits exactly where the scene draws the photo |
| Shapes that melt together                      | `LiquidGlass` with `glass.smooth`          | `smooth` ≈ 30–40 px                                                                                                              |
| An effect this toolbox lacks                   | `ShaderCanvas` with your own fragment      | `src/motion-kit/effects/ShaderCanvas.tsx`; copy a component as the template                                                      |

## Backgrounds

Backgrounds fill the frame from time alone; each takes `time` (seconds, default frame / fps) and `style`.

### Gradient

The primary background: colour stops mixed in OKLab, domain-warped so they flow, with optional silk
bands and per-frame grain.

| Prop         | Default      | Does                                                         |
| ------------ | ------------ | ------------------------------------------------------------ |
| `colors`     | required     | 2–6 hex stops                                                |
| `type`       | `"mesh"`     | `mesh` (drifting colour points), `linear`, `radial`, `conic` |
| `angle`      | `0`          | Degrees, for `linear` and `conic`                            |
| `center`     | `[0.5, 0.5]` | 0–1 position, for `radial` and `conic`                       |
| `speed`      | `1`          | Flow speed                                                   |
| `scale`      | `1.2`        | Noise feature size; higher = smaller features                |
| `warp`       | `1`          | Domain-warp strength; `0` = straight gradient                |
| `bands`      | `0`          | Silk bands across the frame; `0` disables                    |
| `silk`       | `0.5`        | Silk sheen strength, 0–1                                     |
| `softness`   | `1`          | `0` = hard colour regions, `1` = smooth blends               |
| `grain`      | `0.06`       | Grain amount, 0–0.3                                          |
| `grainSize`  | `1.2`        | Grain size, px                                               |
| `contrast`   | `1`          | Lightness contrast in OKLab                                  |
| `saturation` | `1`          | Chroma multiplier in OKLab                                   |
| `seed`       | `0`          | Changes the noise field and mesh paths                       |
| `resolution` | `1`          | Render scale                                                 |

- **Technique**: two-level domain warp — gradient noise displaces the coordinates of a second noise,
  which displaces the gradient's input `[spec]` (Quílez, "domain warping"). Mesh mode places one
  point per colour on slow Lissajous paths and blends by inverse distance, power `1 + 2·(1 − softness)`.
- **OKLab mixing** keeps midpoints vivid; sRGB mixing goes muddy between complementary colours.

### GradientWaves

A ray-marched wave surface under a gradient sky.

| Prop           | Default   | Does                                               |
| -------------- | --------- | -------------------------------------------------- |
| `skyColor`     | `#1a1440` | Top of the sky                                     |
| `horizonColor` | `#7b5cff` | Horizon and fog                                    |
| `waveColor`    | `#2a1a6e` | Troughs                                            |
| `crestColor`   | `#ffb8f0` | Crests, sun highlights                             |
| `speed`        | `0.5`     | Wave speed and camera travel                       |
| `amplitude`    | `1`       | Wave height                                        |
| `frequency`    | `0.45`    | Higher = smaller waves                             |
| `choppiness`   | `0.4`     | `0` rolling sine, `1` sharp crests                 |
| `cameraHeight` | `2.2`     | Camera height above the surface                    |
| `tilt`         | `12`      | Camera pitch below the horizon, degrees            |
| `fog`          | `1`       | Higher = shorter view distance                     |
| `sunAngle`     | `20`      | Sun direction, degrees                             |
| `sheen`        | `0.8`     | Sun specular on the water                          |
| `grain`        | `0.05`    | Grain amount                                       |
| `resolution`   | `0.75`    | Render scale; the ray march is the heaviest effect |

- **Technique**: height = four directional wave trains, octave-stacked, crests sharpened by
  `pow(sin, 1 + 2.5·choppiness)`; each pixel's ray steps toward the surface, then bisects the last
  step 6 times; shading mixes troughs to crests by height, adds diffuse, sun specular, fresnel sky
  reflection and exponential fog.

### PixelField (background)

Without `source`, `PixelField` is a grid of shaped pixels sized by animated noise. Props: [PixelField](#pixelfield).

### Dither (background)

Without `source`, `Dither` dithers its own domain-warped noise waves (`waveSpeed`, `waveFrequency`,
`waveWarp`). Props: [Dither](#dither).

### Sky

Drifting clouds on a sky gradient — a detailed backdrop for liquid glass, and a background in its own right.

| Prop                       | Default              | Does                      |
| -------------------------- | -------------------- | ------------------------- |
| `topColor`, `bottomColor`  | `#0b1a44`, `#27457f` | Sky gradient              |
| `cloudColor`, `shadeColor` | `#e9eef7`, `#2d3f66` | Lit and shadowed cloud    |
| `cover`                    | `0.5`                | `0` clear, `1` overcast   |
| `sharpness`                | `0.3`                | `0` wispy, `1` hard-edged |
| `speed`                    | `1`                  | Drift speed               |
| `scale`                    | `1.5`                | Higher = smaller clouds   |
| `grain`                    | `0.03`               | Grain amount              |

- **Technique**: 6-octave gradient-noise fBm, lightly domain-warped (0.22), thresholded into density;
  sampling the density again toward the light gives soft self-shadowing. Strong warp turns clouds
  into marble — keep it low.
- **As a glass backdrop**: `backdrop={{ shader: { fragment: SKY_FRAGMENT, uniforms: skyUniforms({ … }) } }}`.

Where it lives: `src/motion-kit/effects/backgrounds/Gradient.tsx`,
`src/motion-kit/effects/backgrounds/Sky.tsx`,
`src/motion-kit/effects/backgrounds/GradientWaves.tsx`.

## Filters

A filter samples a video or image as the `uSource` texture; the same component without `source` is a
background ([Backgrounds](#backgrounds)).

### Dither

| Prop                                     | Default              | Does                                                                                 |
| ---------------------------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| `source`                                 | —                    | `MediaInput` ([Media input](#media-input)); omit for the noise-wave background       |
| `mode`                                   | `"bayer8"`           | `bayer8`, `bayer4`, `bayer2`, `halftone`, `lines`, `crosshatch`, `noise`, `none`     |
| `pixelSize`                              | `4`                  | Cell size, px                                                                        |
| `palette`                                | —                    | Dark → light hex colours (up to 8), mapped by luminance; omit to keep source colours |
| `levels`                                 | `2`                  | Levels per channel when there is no palette                                          |
| `contrast`                               | `1`                  | Applied before quantising                                                            |
| `brightness`                             | `0`                  | Added before quantising                                                              |
| `gamma`                                  | `1`                  | > 1 darkens mid-tones                                                                |
| `angle`                                  | `45`                 | Screen angle for `halftone`, `lines`, `crosshatch`, degrees                          |
| `waveSpeed`, `waveFrequency`, `waveWarp` | `0.25`, `1.6`, `1.2` | Background-mode noise waves                                                          |
| `ripples`                                | —                    | [Ripples](#ripples-and-beat-sync); brighten as they pass                             |
| `rippleSpeed`, `rippleWidth`             | `0.9`, `0.08`        | Ring speed (canvas heights per second) and width                                     |

- **Technique**: snap to the cell grid (rotated for screens), tone, then
  `index = floor(luma · (N − 1) + threshold)`. Bayer thresholds come from the recursive definition —
  each bit of (x, y) adds a base-4 digit from the 2 × 2 pattern (0 2 / 3 1) — verified against the
  textbook 4 × 4 and 8 × 8 matrices `[spec]`. Halftone uses radial distance in a rotated cell;
  `noise` uses interleaved gradient noise `[spec]` (Jimenez 2014).

### PixelField

| Prop                                      | Default                 | Does                                                                         |
| ----------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `source`                                  | —                       | `MediaInput`; omit for the noise-field background                            |
| `shape`                                   | `"square"`              | `square`, `circle`, `diamond`, `triangle`, `cross`, `ring`                   |
| `cellSize`                                | `14`                    | Cell pitch, px                                                               |
| `color`                                   | `#d97757`               | Pixel colour                                                                 |
| `sourceColor`                             | `false`                 | Filter mode: pixels take the footage colour                                  |
| `background`                              | —                       | Fill behind the pixels; omit for transparent                                 |
| `scale`, `density`, `speed`, `driftAngle` | `2.2`, `0.6`, `1`, `30` | Background-mode noise: size, coverage, speed, drift direction                |
| `dither`                                  | `0`                     | `0` pixel size follows the value; `1` pixels switch on/off by ordered dither |
| `jitter`                                  | `0`                     | Random per-pixel size variation                                              |
| `twinkle`                                 | `0.2`                   | Per-pixel shimmer                                                            |
| `edgeFade`                                | `0`                     | Fade toward the frame edges                                                  |
| `ripples`, `rippleSpeed`, `rippleWidth`   | —, `0.8`, `0.06`        | [Ripples](#ripples-and-beat-sync)                                            |

- **Technique**: each cell computes one value (noise or source luminance, plus ripples, twinkle and
  jitter), turns it into a coverage size, and draws the shape as a signed-distance mask with 1.2 px
  anti-aliasing; output is premultiplied so a transparent field composites over other layers.

### GradientMap

| Prop                 | Default       | Does                              |
| -------------------- | ------------- | --------------------------------- |
| `source`             | required      | `MediaInput`                      |
| `colors`             | required      | Shadows → highlights, 2–6 hex     |
| `amount`             | `1`           | `0` original, `1` fully mapped    |
| `contrast`           | `1`           | Luminance contrast before mapping |
| `grain`, `grainSize` | `0.06`, `1.2` | Film grain                        |

### Media input

| `MediaInput`                         | Loads with       | Notes                                                         |
| ------------------------------------ | ---------------- | ------------------------------------------------------------- |
| `{ video: "path.mp4", trimBefore? }` | `OffthreadVideo` | Frame-accurate; each decoded frame arrives via `onVideoFrame` |
| `{ image: "path.png" }`              | Remotion `Img`   | Render waits for load                                         |

- **Paths are under `public/`** (passed to `staticFile`); `http(s):`, `data:` and `/` paths pass through.
- **Sources are cover-fitted** to the canvas (`COVER` in `glsl.ts`).
- **The media element stays in the DOM at opacity 0**; video filters are muted — add an
  `Html5Audio` for sound.

Where it lives: `src/motion-kit/effects/filters/`, `src/motion-kit/effects/media.tsx` —
`MediaFeed`, `EffectLayer`.

## Filter a whole video

`npx motion-kit filter <video> --effect <name> [--params '<json>'] [--out file] [--crf n] [--no-audio]`
renders the `FilterVideo` composition over the entire video.

| `--effect`     | Component     | `--params` example                                                        |
| -------------- | ------------- | ------------------------------------------------------------------------- |
| `dither`       | `Dither`      | `{"mode":"halftone","palette":["#141413","#f0eee6"],"pixelSize":8}`       |
| `pixel`        | `PixelField`  | `{"shape":"square","cellSize":12,"sourceColor":true,"background":"#000"}` |
| `gradient-map` | `GradientMap` | `{"colors":["#1b1340","#d97757","#fff1d6"],"grain":0.05}`                 |

- **Size, frame rate and length come from the input** (read with ffprobe); its audio track plays
  unless `--no-audio`.
- **A video outside `public/` is copied to `public/.motion-kit/inputs/`** (git-ignored) because
  `staticFile()` only serves `public/`.
- **Pixel sizes are in the video's own pixels** — a 960 × 540 source needs about half the
  `pixelSize` of a 1920 × 1080 one for the same look.

## Ripples and beat sync

`ripples` replaces the originals' click ripples: each is `{ x, y, at, strength? }` — position 0–1 from
the top-left, start time in seconds.

- **The 8 most recent started ripples are active** (`MAX_RIPPLES`); each ring travels at
  `rippleSpeed` canvas heights per second and fades exponentially.
- **Land ripples on the measured beat grid** with your film's beat clock — `timeAtBeat(b)` returns the measured time of beat `b`:

```tsx
// timeAtBeat(b): seconds at beat b, from the film's measured beats.json
const ripples = [8, 9, 10, 11].map((b, i) => ({
  x: [0.3, 0.7, 0.5, 0.2][i],
  y: 0.5,
  at: timeAtBeat(b),
}));
<PixelField shape="circle" background="#0d0d10" ripples={ripples} />;
```

- **Times are relative to the effect's own timeline** — inside a `Sequence`, subtract the sequence's
  start.

Where it lives: `src/motion-kit/effects/ripples.ts` — `Ripple`, `rippleUniforms`, `RIPPLE_GLSL`.

## Liquid glass

### Props

| Prop                 | Default          | Does                                                                                                                                                                                                          |
| -------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backdrop`           | required         | `{ gradient: GradientProps }`, `{ shader: { fragment, uniforms } }`, `{ color }`, `{ video }` or `{ image }`                                                                                                  |
| `panels`             | required         | Up to 8 `{ x, y, width, height, radius? }` in composition px; `radius` defaults to a capsule                                                                                                                  |
| `placement`          | —                | `{ x, y, width, height, ground? }` px: where an `{ image }` or `{ video }` backdrop sits (with `ground` around it), so the glass refracts what the scene draws there; omitted, the backdrop covers the canvas |
| `glass`              | `DEFAULT_GLASS`  | Partial `GlassStyle`, below                                                                                                                                                                                   |
| `time`, `resolution` | frame / fps, `1` | Backdrop time; render scale                                                                                                                                                                                   |

| `GlassStyle`                               | Default            | Does                                                                          |
| ------------------------------------------ | ------------------ | ----------------------------------------------------------------------------- |
| `refraction`                               | `80`               | Glass thickness, px: scales how far the curved rim bends the backdrop         |
| `bevel`                                    | `64`               | Width of the curved rim, px; a panel under twice this is a full dome (a lens) |
| `ior`                                      | `1.5`              | Index of refraction: `1` no bending, `1.5` glass, higher bends more           |
| `dispersion`                               | `0.4`              | Chromatic split at the rim, 0–1                                               |
| `frost`                                    | `1.5`              | Blur radius, px; `0` = clear glass                                            |
| `saturation`                               | `1.35`             | Vibrancy of what is seen through the glass                                    |
| `brightness`                               | `1.06`             | Brightness through the glass                                                  |
| `tint`, `tintAmount`                       | `#ffffff`, `0.06`  | Glass tint                                                                    |
| `specular`                                 | `0.9`              | Rim highlight strength                                                        |
| `lightAngle`                               | `115`              | Light direction, degrees: 0 from the right, 90 from the top                   |
| `edgeWidth`                                | `1.2`              | Bright edge line, px                                                          |
| `shadow`, `shadowSoftness`, `shadowOffset` | `0.25`, `28`, `10` | Drop shadow strength, blur px, downward offset px                             |
| `smooth`                                   | `0`                | Panels closer than this many px melt together                                 |

### iOS patterns

`src/motion-kit/effects/showcase/LiquidGlassDemo.tsx` (1080 × 1920) and
`src/motion-kit/effects/showcase/LiquidGlassTabBar.tsx` (1920 × 1080) are the references:

- **Tab-bar selection lens**: a capsule slightly taller than the bar, so it bulges out of it through
  the smooth union. Its leading and trailing edges follow the same moves on springs of different
  frequency (3.4 Hz and 2.1 Hz), so the lens stretches as it travels and settles — `indicator()` in `src/motion-kit/lib/math.ts` does this.
- **Merging buttons**: two circles whose gap springs to 0 melt into one capsule, then part.
- **Widgets and tiles**: rounded rectangles (radius 64 px) with crisp DOM text and SVG icons on top.
- **Floating tab bar** (`LiquidGlassTabBar`): a 640 × 150 capsule with `refraction: 110`, `bevel: 72`
  (nearly a full dome across its height), clear glass (`frost: 0.5`), over `Sky`; the selection lens
  is a capsule 20 px taller than the bar, so it bulges out of it.
- **Wallpaper**: `Sky` as a shader backdrop gives the glass detail to bend; `{ image }` or `{ video }`
  for a photo.

Where it lives: `src/motion-kit/effects/ui/LiquidGlass.tsx` — `LiquidGlass`,
`DEFAULT_GLASS`, `GlassPanel`, `GlassStyle`.
