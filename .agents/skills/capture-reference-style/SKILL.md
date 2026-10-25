---
name: capture-reference-style
description: Study a reference video's visual grammar — palette, type, shot lengths and cuts, transitions, camera moves, texture and grain, how text enters and exits — from frames every 0.5 s and measured cuts, palette and grain, then write a style guide and a shot list for new content in that style, and wait for approval before any code. Use when the user supplies a reference video or frames and asks for a film "in this style", "like this", or to match a look.
---

# Capture a reference style

Turns a reference video into `docs/references/<name>/STYLE_GUIDE.md` and `SHOTLIST.md`: the
reference's grammar applied to the user's own subject. **Take the grammar, never the content**: no
logos, characters, footage, copy or music from the reference.

Before you start, read [references/style-guide.md](references/style-guide.md): what each section
must say, how to read the measurements, and the shot list format.

## Steps

1. **Confirm the inputs**: the reference file (often `refs/<name>.mp4`), the new film's subject and
   length, and its format. Ask for any that are missing.
2. **Analyse**: `npx motion-kit reference <video> [--name <name>]`. It writes `refs/<name>/`:
   `frames/` (one every 0.5 s, 640 px), `contact.png` (every frame, labelled, cuts outlined) and
   `analysis.json` (cuts, shots and their lengths and pace, palette, tone, grain). `--every 0.25` for
   fast-cut references.
3. **Look at everything**: `contact.png` first, then the frames around each cut and any frame with
   type. The numbers say where cuts are and how long shots last; the frames show what the
   transitions, camera and type actually do. Judge fonts from the largest clear frame.
4. **Write `docs/references/<name>/STYLE_GUIDE.md`** with every section in the style-guide reference:
   each claim backed by frames (`frames/0012.png`, 5.5 s) or by a measurement. Mark what you could not
   determine (an exact font, motion between sampled frames) as an estimate.
5. **Write `docs/references/<name>/SHOTLIST.md`** for the user's subject: the film's length divided
   into shots with the reference's shot-length rhythm, each shot's content (new), and its grammar
   (from the guide): transition in, camera, type behaviour.
6. **Show both files and wait for the user's OK.** No film code before it.
7. **Then make the film** with the make-motion-film skill, using the guide as its style source and
   the shot list as its beat plan (shots snapped to beats; say how the shot lengths moved).

If your tool runs subagents, steps 2–5 can go to the `style-analyst` agent: it looks at every frame
and returns the two files, keeping the frames out of the main conversation.

## Rules

- **Grammar only**: palette, type behaviour, rhythm, transitions, camera, texture. Never copy the
  reference's logos, characters, footage, words or music, and never name it on screen.
- **Fonts**: name the closest family you can identify and a licensed substitute; say when it is a
  guess.
- **Reference files stay local**: `refs/` holds someone else's work; keep it out of git
  (`npx motion-kit init` ignores it).
