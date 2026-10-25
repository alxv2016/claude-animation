---
name: apply-effect
description: Add a shader effect to a video — animated backgrounds (grainy gradients, ray-marched waves, clouds, pixel and dither fields), filters over footage or images (dither, halftone, pixel mosaic, duotone/gradient map, film grain), or Apple-style liquid-glass UI. Use when the user asks for a dithered, halftone, pixelated, retro, grainy, gradient, duotone or glass look, a background for a scene, or "apply this effect to my video".
---

# Apply an effect

Effects are WebGL2 components in the project's vendored library (`src/motion-kit/effects`), each a
pure function of the frame. Pick one from the catalogue, wire it in, check it at full size.

Before you start, read [references/rules.md](references/rules.md) — the rules and the traps (black
filters, grey dither under motion blur, huge files).

## Steps

1. **Check the setup**: `npx motion-kit doctor`; if the library is missing, `npx motion-kit init`.
2. **Pick the effect** from the request with the task lookup in
   [references/catalog.md](references/catalog.md#task-lookup); its props and defaults are in the
   same file. If several fit, say which you chose and why.
3. **Choose the route**:
   - **The user's whole video, filtered** → one command, no code:
     `npx motion-kit filter <video> --effect dither|pixel|gradient-map --params '<json>'`
     (`--params` takes the effect's props, minus `source`; `--crf 21` for a smaller delivery file).
     Output keeps the video's size, frame rate, length and sound: `out/<name>-<effect>.mp4`.
   - **A background or filter inside a composition** → import the component from
     `./motion-kit/effects` (path relative to your file) and place it as a layer; for a filter, pass
     `source={{ video: "<path under public/>" }}` or `{ image: … }`.
   - **Liquid-glass UI** → `LiquidGlass` with a detailed backdrop (`Sky`, an image or a video) and
     panels driven by springs; start from the iOS patterns in the catalogue.
4. **Use the brand when there is one**: colours from `public/brands/<domain>/video-theme.json`
   (capture-brand skill) as the palette, colours or tint.
5. **Look at it**: `npx motion-kit still <composition> <frame>` for one full-size frame, or
   `npx motion-kit sheet <composition>` across the timeline. Judge dither and pixel effects at full
   size — thumbnails show moiré that is not in the film.
6. **Report** what you applied, the props that matter, and anything to watch (file size, motion
   blur, the effect being invisible over a flat backdrop).
