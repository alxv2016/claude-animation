---
name: render-and-deliver
description: Render a finished motion-graphics film to MP4 and check it before handing it over — master render (H.264 yuv420p, CRF 16, AAC), verification of codec, loudness (−14 LUFS), true peak and bitrate, a smaller delivery copy for grainy films, a poster frame, a contact sheet and a loop check for looping films, and where to watch it with sound. Use when a film has passed review and the user wants the final video, an export, or a file to share.
---

# Render and deliver

Turns a reviewed composition into a file you can hand over, with proof it plays and sounds right.
Rules, settings and traps: [references/delivery.md](references/delivery.md).

## Steps

1. **Confirm it passed review and the user approved it**: `review_log.md` holds at least three
   independent rounds and the last has every criterion at 8 or more (R19, R23, R24), and the user
   approved the contact sheet and animatic (R25). If not, run the review-film skill first.
2. **Master render**: `npx motion-kit render <composition>` → `out/<composition>.mp4`. Expect roughly
   the film's length to a few times it; heavy WebGL effects take longer.
3. **Verify**: `npx motion-kit verify out/<composition>.mp4`. Fix every `FAIL` and re-render; read
   every `warn`.
4. **Delivery copy** when `verify` warns about bitrate (grain or dither) or the file is too large to
   send: `npx motion-kit render <composition> --crf 21 --out out/<composition>-delivery.mp4`, then
   verify it too. Keep the CRF 16 master.
5. **Spot-check frames**: `npx motion-kit still <composition> <frame>` at the opening, a busy moment
   and the last frame.
6. **The deliverables beside the film**, per format:
   - **Poster**: `npx motion-kit still <composition> <frame>` at the frame that sells the film (usually
     the product at rest or the lockup), copied to `out/<composition>-poster.png`.
   - **Contact sheet**:
     `npx motion-kit sheet <composition> --beats <beats.json> --out out/<composition>-contact.png`.
   - **Loop check**, only if the film loops: the film twice end to end,
     `npx remotion ffmpeg -stream_loop 1 -i out/<composition>.mp4 -c copy out/<composition>-loop-check.mp4`;
     watch the seam.
7. **Hand over**: give the path(s), duration, size, bitrate and loudness, the poster and contact
   sheet, and say where to watch it with sound — QuickTime or a browser, not VS Code's built-in
   preview (see the delivery traps). Say what you would improve next.
