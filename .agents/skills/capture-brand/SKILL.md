---
name: capture-brand
description: Capture a website's brand for video — colours, fonts, type scale, easing, components, logo and screenshots — then curate it into a video theme and a per-brand STYLE_GUIDE.md. Use when the user gives a product or company URL, asks to match a brand, or a film needs real screenshots, logo or colours from a site.
---

# Capture a brand

Turns a URL into `public/brands/<domain>/` (captured facts, screenshots, crops) and
`docs/brands/<domain>/STYLE_GUIDE.md` (a guide for films), with a review pass in between for the
decisions a capture cannot make.

Before you start, read [references/rules.md](references/rules.md) — the rules and the traps that
silently produce a wrong brand.

## Steps

1. **Check the right to capture.** Confirm the site is the user's own, a client's with permission,
   or for internal reference only. If unclear, ask.
2. **Make sure the project is set up**: `npx motion-kit doctor`. If it reports a missing setup, run
   `npx motion-kit init` and `npm install` first.
3. **Capture**: `npx motion-kit brand capture <url>` (add `--no-fonts` to skip font files). It prints
   the accent candidate, token counts, components and any consent buttons it dismissed.
4. **Generate the first guide**: `npx motion-kit brand guide <domain>`. Curated sections start as
   `— NOT CURATED`.
5. **Look at the evidence**: open `public/brands/<domain>/screenshots/` (desktop, mobile, full page)
   and `components/`. Check for consent banners, pop-ups or a challenge page; if the capture is
   unusable, stop and tell the user.
6. **Review pass** — make the decisions in [references/review-pass.md](references/review-pass.md):
   accent, text colour, font roles and substitutes, then write the three curated sections (rules,
   voice, components to animate) between their `<!-- curated:… -->` markers. Record values in
   `public/brands/<domain>/overrides.json` (keys in [references/files.md](references/files.md)).
7. **Regenerate**: `npx motion-kit brand guide <domain>` — clears the `NOT CURATED` headings and
   rebuilds `video-theme.json` with your overrides.
8. **Report to the user**: the accent and why, fonts and their licence status, what the capture
   could not see (logins, animation, other pages), and the guide's path.

## Using the brand in a film

`video-theme.json` and the helpers in `src/motion-kit/brand/theme.ts` (`loadBrandFonts`,
`brandEasing`) — see [references/files.md](references/files.md#video-theme).
