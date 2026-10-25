# Effects: rules and traps

### Do

1. **Drive every effect from the frame** — components read `useCurrentFrame()`, or take `time` in
   seconds; no `requestAnimationFrame`, clocks or pointer input.
   - Why: the render contract ([studio rules](../../review-film/references/studio-rules.md)); Remotion renders frames out of order and in
     parallel.
2. **Script what the originals did with the pointer**: ripples are `Ripple` events ([ripples](catalog.md#ripples-and-beat-sync)), glass panels
   move by springs, cursors follow paths.
3. **Render with the `angle` GL backend** — `render.mjs` and `remotion.config.ts` set it.
   - Why: it is the fastest backend and renders identically run to run (byte-identical frames, 0.56 s per still against 1.9 s on the default backend); other backends differ by
     a few pixel values.
4. **Keep crisp effects (`Dither`, `PixelField`) outside `MotionBlur`** — layer them above the
   blurred content, or render that film without blur.
   - Why: blur averages 8 subframes, which turns hard dither cells into in-between tones (traps, below).
5. **Put media for filters under `public/`** and pass the path (`{ video: "samples/footage.mp4" }`);
   absolute URLs also work.
6. **Judge crisp effects from full-size frames**, not sheet thumbnails — downscaled dither and mosaics
   show moiré that is not in the film (traps, below).

### Never

- **Never use `Math.random`** in an effect — shaders hash coordinates and the frame index (`HASH`,
  `GRAIN` in `glsl.ts`).
- **Never stack more than a few WebGL layers in one frame** — Chrome keeps about 16 live contexts per
  page, and each `MotionBlur` sample is another copy. Combine looks in one shader instead.
- **Never point a filter or `LiquidGlass` at page content** — WebGL cannot read the DOM; the source is
  a video, an image, or a shader drawn in the same canvas. To filter a React-built film, render it first, then run `npx motion-kit filter` on the MP4.

## Traps

- **Filter renders black** → the media frame arrived after the texture was read → texture props are
  getters read at draw time (`EffectLayer` passes `() => frame.current`); keep that pattern in new
  media effects.
- **Dither or pixels look soft and grey** → `MotionBlur` averaged subframes over a crisp effect →
  keep crisp effects outside the blur (rule 4).
- **Film is hundreds of megabytes** → per-frame grain and dither are noise H.264 cannot compress: the
  showcase is 87 Mb/s at CRF 16 versus about 5 Mb/s for a flat-colour film → lower `grain`, raise
  `grainSize` to 2–3 px, or encode the delivery copy at CRF 20–23.
- **Sheet thumbnails show stripes or moiré** → 9–14 px cells scaled to a quarter alias → check a
  full-size `node render.mjs still <frame> <composition>`.
- **`FrameSheet` thumbnails are stretched or mis-positioned** → `useVideoConfig()` inside the sheet
  returned the sheet's size → each target renders inside `<Sequence width height>` so effects see the
  target's size; keep it.
- **`Error: Page crashed!` or "Too many active WebGL contexts"** → too many effect canvases alive at
  once → fewer layers, shorter overlaps between sequences; unmounted effects release their context
  after the commit (`ShaderCanvas`, `LiquidGlass`).
- **"Does this look like a foreign page?" when rendering** → Remotion's port probe hit a running
  Studio on :3000 → `render.mjs` uses port 3555; override with `RENDER_PORT`.
- **"WebGL2 unavailable"** → a backend without WebGL2 → `chromiumOptions.gl = "angle"`.
- **Glass refraction is invisible** → there is nothing behind the glass to bend (a flat sky, a soft
  gradient) → refraction shows on detail: clouds (`Sky`), an image, text, stripes. Raise `refraction`
  and widen `bevel` toward half the panel's height for a full dome.
- **Glass rim magnifies instead of wrapping** → samples taken inward from the rim stretch the edge →
  the shader samples outward (`disp = −R.xy …`), so the curve shows a compressed view of the
  surroundings; keep that sign.
- **Glass panels bridge into each other** → panels closer than about `smooth / 2` merge → keep gaps
  ≥ `smooth / 2`, or set `smooth: 0` when nothing should melt.
