# Brand capture: rules and traps

## Do

1. **Capture only sites you have the right to use** — your own product, a client's with permission, or
   for internal reference. Screenshots, logos and fonts belong to the site's owner.
2. **Run the review pass before a captured brand goes into a film** ([review-pass.md](review-pass.md)).
   - Why: the capture reads what the page paints, not what the brand intends — the accent can be
     missing from the page entirely (traps, below).
3. **Record curated choices in `overrides.json`, never in `brand.json`** — `brand.json` is rewritten on
   every capture.
4. **Edit a `STYLE_GUIDE.md` only between `<!-- curated:… -->` markers** — `motion-kit brand guide`
   rewrites everything else and keeps only those regions.
5. **Re-run `npx motion-kit brand guide <domain>` after every capture or `overrides.json` change** — it
   regenerates `video-theme.json` and the guide from both files.
6. **Look at the screenshots after capture** — they show consent banners, pop-ups and loading states
   the capture did not dismiss.

## Never

- **Never commit captured font files** — `public/brands/*/fonts/` is git-ignored (`motion-kit init`
  adds the rule); brand fonts are usually licensed to the site's owner.
- **Never publish a film using captured fonts without a licence** — record a substitute in
  `overrides.json` (`fonts`) instead.
- **Never treat an uncurated guide as approved** — a section headed `— NOT CURATED` has not been
  reviewed.

## Traps

- **Accent missing or wrong** → the accent may be declared but never painted on the page (anthropic.com:
  `--color-clay` on 0 elements), or the page's most saturated colours belong to illustrations
  (linear.app: pink from artwork while the brand indigo `--color-indigo` is unused) → read the guide's
  accent candidates (§2.2) and colour tokens (§2.4), then set `accent` in `overrides.json`.
- **Text colour is body grey, not the headline colour** → the text role is the colour covering the
  most characters, usually body copy → set `text` in `overrides.json` when headlines differ.
- **Video type scale out of order** (H1 smaller than H2) → the site's own `h1` is smaller than its `h2`
  (anthropic.com: serif `h1` 40.8 px, sans `h2` 51.9 px); the scale keeps the site's ratios → choose
  display sizes per shot (160–520 px suits kinetic display type at 1920 × 1080).
- **Consent banner in a screenshot** → the dismisser only clicks buttons named like "Accept all",
  "Accept", "Agree", "Allow all" or "Got it" → check the screenshots; dismissals are listed in the
  guide's §11.
- **Pages behind a login are not captured** → no authentication support; product UI behind a login
  needs another source (the user's own screenshots).
- **Bot protection or a challenge page** → the capture records whatever the server returned → the
  screenshots show it; capture from a network the site allows.
- **Only the first state of the home page** → no hover states, scroll-triggered or JavaScript-driven
  animation, no other pages → motion tokens come from CSS only.
- **A font role is empty** → the role is read from the element that uses it (`h1`, `p`, `code`); a
  mono face with no `<code>` on the page falls back to any captured face named "mono" → set `fonts` in
  `overrides.json` otherwise.
- **Component crops show the wrong thing** → components are found by tag and class-name patterns with
  size limits → pick the right crops in the review pass.
