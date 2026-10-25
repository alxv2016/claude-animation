# Showreel

A film whose subject is the maker's craft: every scene demonstrates a named technique, rather than
decorating a message. Variants: the résumé reel (15 s), the long reel cut to a piano track (60 s), and the
agency reel (a persona's reel for its clients).

## Inputs

| Input   | Required | Default                                                             |
| ------- | -------- | ------------------------------------------------------------------- |
| Length  | No       | 15 s; the prompt's length otherwise                                 |
| Format  | No       | 16:9                                                                |
| Persona | No       | The model itself as a motion designer; an agency or studio if named |
| Brand   | No       | The persona's own; for an agency, invent one with one accent        |
| Music   | No       | Effects only; the user's track if they have one (R13)               |

None are blocking: a showreel can start from the prompt alone.

## Structure

| Part     | Share    | On screen                                                                       |
| -------- | -------- | ------------------------------------------------------------------------------- |
| Hook     | 0–2 s    | The strongest single technique, moving on the first beat; no title card         |
| Craft    | ~80 %    | One scene per technique, a new scene every bar, an event every beat (R12)       |
| Build    | 1–2 bars | Tension: faster keys, a push, a shake; a silent half-beat before the drop       |
| Sign-off | 2–3 s    | The mark and name, as a designer signs a reel; a tagline in the persona's voice |

- **Name the craft on screen**: small numbered captions beside the subject ("03 144 cells, one
  rule"), never in a corner (R7).
- **Self-reference earns attention**: the film can show how it is made (the frame being rendered, the
  spacing chart's scale).
- **Every scene is a different technique** ([techniques.md](../references/techniques.md)); every join
  is a designed transition, and no two joins use the same one.
- **60 s**: about 25 scenes; group them into 4–5 movements with a change of tempo or texture between,
  so a minute does not feel like one long montage.

## Look

Flat grounds, one accent, a serif or grotesque display face and a mono UI face; short, lowercase,
technical copy; no slogans or exclamation marks.

## Sound

- **Sound design, not music** (R13): an effect on every picture event — swooshes peaking on arrivals,
  impacts with shake on scene changes, a riser into the build, an impact on the sign-off.
- **With the user's track**: measure it (`track` in `score.mjs`); big moments on its downbeats, small
  hits on its onsets.
- **Silence is a technique**: the half-beat before the drop.

## Checks

- Count the techniques: none repeats across scenes.
- The hook moves on beat 0 and reads at phone size by 2 s.
- No corner text, no frame borders, no centred title on a gradient (R5, R7).

## Example prompts

Kept verbatim; this file is their home.

**The résumé reel** — the brief for the kit repo's showreel (`src/reel/`).

```text
make a dynamic 15-second motion graphics video that shows what an
incredible motion designer you are, like it's your showreel for a résumé.
go all out.
```

**The long reel with a piano score** (pattern from @kloss_xyz's 90-second piano reel).

```text
make a dynamic 16:9, 60-second motion graphics showreel that shows your real creative limits.
S-tier sound design, no generic synth pads. Compose an original piano score and sync every
cut to it. Export 1080p MP4.
```

A prompt that asks the kit to compose music — the long reel's "compose an original piano score" —
gets sound design instead: ask the user for the track (a piece they own or license), measure it, cut
on its onsets, and add effects over it (R13).

**The agency reel.**

```text
make a 30-second showreel as if you were a niche branding studio for startup founders.
Create every graphic from scratch. One accent color. Every shot is a different technique.
```
