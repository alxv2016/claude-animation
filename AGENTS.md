# AGENTS.md

Instructions for AI coding agents working in this repo — Claude Code, Codex, Cursor, Gemini CLI or any
other tool that reads `AGENTS.md`.

## What this repo is

**motion-kit**: a kit for making motion-graphics films with AI agents — Remotion film tooling, WebGL
effects (backgrounds, filters over footage, liquid glass), website brand capture, and portable skills
and agents. It is also the kit's test bench: the showreel in `src/reel/` and the effects showcase in
`src/effects/showcase/` are built with it.

## Start here

- **Setup and commands**: [README.md](README.md).
- **The kit CLI**: `npm run mk -- <command>` in this repo; `npx motion-kit <command>` in any other
  project. `--help` lists the commands. Prefer the CLI over calling scripts directly.
- **Docs** (written to [docs/DOCUMENTATION_GUIDELINES.md](docs/DOCUMENTATION_GUIDELINES.md)):
  - [docs/MOTION_KIT.md](docs/MOTION_KIT.md) — the kit, the CLI, and how skills and agents are packaged
  - [docs/MOTION_REEL.md](docs/MOTION_REEL.md) — the showreel, motion techniques, and the studio rules
    and example prompts (§22)
  - [docs/EFFECTS.md](docs/EFFECTS.md) — shader backgrounds, filters, liquid glass
  - [docs/BRAND_CAPTURE.md](docs/BRAND_CAPTURE.md) — brand capture internals

## Rules for every film

1. **Every frame is a pure function of time** — compute everything from the frame number; no
   `Math.random`, timers, `requestAnimationFrame`, CSS transitions or state carried between frames
   ([MOTION_REEL.md §1](docs/MOTION_REEL.md#1-rules)).
2. **Follow the studio rules** ([MOTION_REEL.md §22.2](docs/MOTION_REEL.md#222-studio-rules)): no
   banned defaults, one display face and one UI face, one accent, something new every 2–4 s, sound on
   the measured beat grid at −14 LUFS, and the contact-sheet review loop before any full render.
3. **Render with the `angle` GL backend** — `render.mjs` and `remotion.config.ts` set it; WebGL
   effects depend on it.
4. **Look before you claim it works** — render stills or a frame sheet and inspect them.

## Skills and agents

Their home is `.agents/`: `.agents/skills/<name>/SKILL.md` (procedures, with reference files beside
them) and `.agents/agents/<name>.md` (role prompts). They are plain Markdown any tool can read; when a
task matches a skill's description, read its `SKILL.md` and follow it. Claude Code loads them through
symlinks in `.claude/`, created by `npm run mk -- skills install`. Edit the files in `.agents/`,
never through `.claude/`.

## Working rules

- **Change docs in the same commit as the code they describe**
  ([DOCUMENTATION_GUIDELINES.md §8](docs/DOCUMENTATION_GUIDELINES.md#8-keeping-docs-true)).
- **Skills hold steps, docs hold rules and reasons**: a skill links to what it relies on and never
  copies a doc's sections (DOCUMENTATION_GUIDELINES.md §1, Principle 8).

<!-- motion-kit:skills:start -->

## motion-kit skills and agents

Installed by `npx motion-kit skills install`. Each skill is `.agents/skills/<name>/SKILL.md`: read it
when a task matches its description, and follow it. Agents in `.agents/agents/` are role prompts.

| Skill                                                    | Use when                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`capture-brand`](.agents/skills/capture-brand/SKILL.md) | Capture a website's brand for video — colours, fonts, type scale, easing, components, logo and screenshots — then curate it into a video theme and a per-brand STYLE_GUIDE.md. Use when the user gives a product or company URL, asks to match a brand, or a film needs real screenshots, logo or colours from a site. |

<!-- motion-kit:skills:end -->
