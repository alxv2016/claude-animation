# Brand capture: review pass

After capture, look at the screenshots and crops and record the decisions the capture cannot make.
Until then the guide's curated sections are headed `— NOT CURATED`.

| Decision                                 | Evidence in the guide                     | Recorded in                             |
| ---------------------------------------- | ----------------------------------------- | --------------------------------------- |
| The accent                               | §2.2 candidates, §2.4 tokens, screenshots | `overrides.json` `accent`               |
| The text colour                          | §2.1, §3.2 colours per element            | `overrides.json` `text`                 |
| Font roles and licensed-font substitutes | §3.1, §3.2                                | `overrides.json` `fonts`; curated rules |
| Do and Never for the brand in motion     | §2–§7, screenshots                        | `curated:rules` (§1 of the guide)       |
| Voice and on-screen copy                 | §7 headlines, title, description          | `curated:voice` (§8)                    |
| Which components to animate, and how     | §6 crops, §4 easing                       | `curated:animate` (§9)                  |

- **Every curated rule names its evidence** — a section of the guide or a screenshot — so the next
  capture can show whether it still holds.
- **Write inside the markers only**: `<!-- curated:rules -->` … `<!-- /curated:rules -->`, and the
  same for `voice` and `animate`. Everything outside is regenerated.
- **Re-run `npx motion-kit brand guide <domain>` after editing** to clear the `NOT CURATED` status.

## What good curated sections contain

**Rules** — `### Do` and `### Never`, one bold rule per item with its reason, for example:

- **Use the accent as a single point of emphasis per shot** — the home page paints it on 0 elements
  (§2.2); it is held in reserve, so a full accent surface over-spends it.
- **No gradients, glows or drop shadows** — the site uses one shadow in total (§5).

**Voice** — how headlines read (sentence case? periods? exclamation marks?), how products are named,
how metadata is set, and how much copy goes on screen per beat.

**Components to animate** — a table: component (and its crop file), its use in a film, and the
motion (for example "card rises 40–60 px on the brand's ease-out; dividers draw left to right").
Also list what was not captured and where to get it (a login screen, the product UI).
