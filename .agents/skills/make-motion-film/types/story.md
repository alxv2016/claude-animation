# Story

A film that tells something — a history, how a thing works, a change over time — with a showreel's
energy. The story sets the structure; techniques serve it.

## Inputs

| Input          | Required | Default                            |
| -------------- | -------- | ---------------------------------- |
| Topic and span | Yes      | —                                  |
| Length         | No       | 45 s                               |
| Format         | No       | 9:16 when the prompt says vertical |
| Style source   | No       | Studio default                     |

## Steps the playbook adds

1. **Research before the storyboard.** List the events, dates, names and numbers the story needs,
   each with a source. Mark anything you could not confirm; leave it out or say so on screen. Never
   invent a fact.
2. **Storyboard on the grid.** One beat of story per scene (2–4 s); in `brief.md`, each row has the
   date or step, the picture, the copy and the source.
3. **Checkpoint**: show the storyboard and the fact list; wait for the OK. "Surprise me with the
   storyboard" still means show it before building.

## Structure

| Part     | Share | On screen                                                                                                      |
| -------- | ----- | -------------------------------------------------------------------------------------------------------------- |
| Hook     | 0–2 s | The present-day end of the story, or its most surprising fact                                                  |
| Timeline | ~80 % | One era or step per scene; a visual through-line (a line, an object, a shape) that carries from scene to scene |
| Today    | 3–4 s | Where it stands now; a closing line                                                                            |

- **A through-line** makes it one story, not a slideshow: the same object evolving, a timeline that
  the camera travels along, a counter of years.
- **Dates and names large**: at least 120 units for the year, 56 for copy (phone readability).
- **Vertical first**: compose for 9:16 and its safe area ([layout.md](../references/layout.md)).

## Sound

Sound design that changes with the eras (the texture of the effects), an impact and a picture hit on
each new date. Music only from the user's track (R13).

## Checks

- Every fact on screen is in the fact list with a source.
- Each scene reads in the time it is on screen: count words; about 3 words per second at most.

## Example prompt

Kept verbatim; this file is its home. Pattern from @sonnylazuardi.

```text
use your showreel energy, but tell a story: the history of [TOPIC] from [START] to today,
surprise me with the storyboard. 45 seconds, vertical 9:16.
```
