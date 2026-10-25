# claude-animation

**motion-kit** — a kit for making motion-graphics films with AI agents: Remotion film tooling, shader
effects and liquid glass, website brand capture, and portable skills that work in any LLM tool. This
repo is the kit and its test bench (a showreel and an effects showcase built with it).

## Use the kit in your project

```sh
npx --package=github:alxv2016/claude-animation motion-kit init --install   # Remotion + kit library
npx motion-kit skills install          # skills → .agents/ (any tool), linked into .claude/
npx motion-kit doctor                  # check the setup
npm run dev                            # Remotion Studio
```

Agents read [AGENTS.md](AGENTS.md); the kit is described in [docs/MOTION_KIT.md](docs/MOTION_KIT.md).
Remotion needs a company licence above a certain company size — see remotion.dev/license.

## Work on this repo

### Remotion

```sh
npm install
npm run dev      # Remotion Studio: play, scrub, chapter tracks (no motion blur)
npm run audio    # synthesize the score → public/reel.wav, measure its beat grid → src/reel/beats.json
npm run sheet    # contact sheet, one frame per beat → out/sheet.png
npm run render   # out/reel.mp4 (1920×1080, 60 fps, H.264 yuv420p, CRF 16, AAC)
npm run demo     # viewer for out/reel.mp4 with a beat timeline → http://localhost:4173
```

`node render.mjs strip 3.5,3.75,4` renders chosen beats as a strip, for scrubbing transitions.

The reel lives in `src/reel/`: one file per scene under `scenes/`, composed in `Reel.tsx`. Every
scene is a pure function of the beat number, timed from the measured grid. The studio rules every film follows,
and the example prompts, are in [docs/MOTION_REEL.md §22](docs/MOTION_REEL.md#22-brief-persona-and-studio-rules).

### Effects

Shader backgrounds (grainy gradients, waves, clouds, pixel and dither fields), filters over video and images
(dither, halftone, mosaic, gradient map) and liquid-glass UI, in `src/effects/`.

```sh
node render.mjs film EffectsShowcase                      # every effect → out/EffectsShowcase.mp4
node render.mjs film LiquidGlassDemo                      # iOS-style liquid glass → out/LiquidGlassDemo.mp4
node render.mjs film LiquidGlassTabBar                    # glass tab bar over clouds → out/LiquidGlassTabBar.mp4
node render.mjs frames LiquidGlassDemo 0,60,120,180       # chosen frames of any composition in one grid
node render.mjs still 200 LiquidGlassDemo                 # one full-size frame
```

See [docs/EFFECTS.md](docs/EFFECTS.md).

### Brand capture

```sh
npm run mk -- brand capture https://example.com   # Playwright → public/brands/example.com/
npm run mk -- brand guide example.com             # → video-theme.json + docs/brands/example.com/STYLE_GUIDE.md
```

Uses `playwright-core` with Remotion's headless Chrome; no separate browser download. Curate each
brand before use — see [docs/BRAND_CAPTURE.md](docs/BRAND_CAPTURE.md).

## Documentation

- [docs/MOTION_KIT.md](docs/MOTION_KIT.md) — the kit: CLI, `init`, packaging of skills and agents
- [docs/MOTION_REEL.md](docs/MOTION_REEL.md) — how the showreel is built, timed, scored and rendered;
  reference for its easing, springs, morphing, transitions and camera; the studio rules and example
  prompts (§22)
- [docs/EFFECTS.md](docs/EFFECTS.md) — shader backgrounds, filters over footage and liquid-glass UI;
  which effect for which request
- [docs/BRAND_CAPTURE.md](docs/BRAND_CAPTURE.md) — capturing a website's brand with Playwright and
  generating a video theme and style guide
- [docs/brands/](docs/brands/) — one video `STYLE_GUIDE.md` per captured brand; worked example:
  [anthropic.com](docs/brands/anthropic.com/STYLE_GUIDE.md)
- [docs/DOCUMENTATION_GUIDELINES.md](docs/DOCUMENTATION_GUIDELINES.md) — how to write docs in `docs/`
