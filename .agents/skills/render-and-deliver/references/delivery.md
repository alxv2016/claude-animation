# Delivery: settings, rules and traps

## Settings

`npx motion-kit render` and `still` use these (the kit's `render-core.mjs`):

| Setting     | Value                | Why                                                            |
| ----------- | -------------------- | -------------------------------------------------------------- |
| Codec       | H.264, `yuv420p`     | Plays everywhere — phones, browsers, social platforms (R4)     |
| CRF         | 16 (master)          | Visually lossless; `--crf 20`–`23` for a smaller delivery copy |
| Audio       | AAC, 320 kb/s        | Transparent for a short film                                   |
| GL backend  | `angle`              | WebGL effects render on the GPU and identically run to run     |
| Concurrency | 3                    | Bounded memory with motion blur and WebGL layers               |
| Port        | 3555 (`RENDER_PORT`) | Avoids a running Remotion Studio on :3000                      |

## Rules

1. **Keep the CRF 16 master**; make delivery copies from the composition, never by re-encoding the
   master (each encode loses quality).
2. **Verify every file you hand over** with `npx motion-kit verify` — a render that finished can
   still have no audio, wrong loudness or the wrong pixel format.
3. **Loudness is −14 LUFS ± 1, true peak ≤ −1 dBTP** (R15) — measured on the MP4, after AAC encoding.

## Traps

- **"No sound" in VS Code** → VS Code's built-in video preview cannot decode AAC; the file is fine →
  watch in QuickTime or a browser. For a VS Code preview, copy with Opus audio:
  `npx remotion ffmpeg -i out/<f>.mp4 -c:v copy -c:a libopus -b:a 256k out/<f>-opus.mp4`.
- **Hundreds of megabytes for a short film** → per-frame grain and dither are noise H.264 cannot
  compress (80–90 Mb/s at CRF 16, against about 5 Mb/s for flat colour) → a delivery copy at CRF
  20–23, or less grain.
- **`Error: Page crashed!` mid-render** → too much per frame for Chrome's memory, typically
  `MotionBlur` above 8 samples over heavy layers → 8 samples or fewer.
- **"Does this look like a foreign page?"** → something else answers on the render port → set
  `RENDER_PORT` to a free port.
- **The first render downloads 171 MB** → Remotion's Chrome Headless Shell, once per project →
  expected; needs network once.
- **`EncodingError: The source image cannot be decoded` or `blob:… net::ERR_FILE_NOT_FOUND` in the log
  while filtering a video** → a
  render tab read a video frame before it was ready and retried → harmless when the render finishes;
  spot-check frames if in doubt.
- **The system `ffmpeg` fails** (wrong architecture, missing filters) → the kit only uses Remotion's
  bundled build (`npx remotion ffmpeg`, `npx remotion ffprobe`).
