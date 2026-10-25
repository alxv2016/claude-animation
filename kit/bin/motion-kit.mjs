#!/usr/bin/env node
// motion-kit CLI: the stable interface skills and agents call, in any project and from any tool.
// See docs/MOTION_KIT.md.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERSION = JSON.parse(fs.readFileSync(path.join(KIT, "package.json"), "utf8")).version;

const HELP = `motion-kit ${VERSION}

Usage: motion-kit <command> [options]

  init [--force] [--install] [--kit <spec>]   Set up Remotion and the kit library in this project
  update                                        Refresh the vendored kit library (src/motion-kit/)
  brand capture <url> [--no-fonts]              Capture a website's brand → public/brands/<domain>/
  brand guide <domain>                          Video theme + docs/brands/<domain>/STYLE_GUIDE.md
  render <composition> [--crf n] [--out file] [--props json] [--animatic]
                                                Full render → out/<composition>.mp4 (H.264, CRF 16, AAC);
                                                --animatic: half size, quick → out/<composition>-animatic.mp4
  still <composition> <frame> [--scale n] [--props json]
                                                One frame → out/frame-<composition>-<frame>.png
  sheet <composition> [--frames a,b | --every n | --beats file.json [--offset 0.5] | --count n] [--cols 4] [--width 480] [--out file]
                                                Contact sheet of any composition → out/sheet-<composition>.png
  filter <video> --effect dither|pixel|gradient-map [--params json] [--out file] [--crf n] [--no-audio]
                                                Filter a whole video, keeping its sound
  verify <file> [--lufs -14]                    Check codec, loudness, peak and bitrate before delivery
  reference <video> [--name n] [--every 0.5] [--rate 10]
                                                Study a reference video → refs/<name>/ (frames, contact.png, analysis.json)
  new-film <slug> [--bpm 120] [--bars 8] [--fps 60] [--formats 16:9,9:16,1:1] [--chapters "A,B,…"] [--title "…"]
                                                Scaffold src/films/<slug>/ and register it in src/Root.tsx
  storyboard <film dir> [--cols n] [--width px] [--out file]
                                                The storyboard to approve, from storyboard.json → out/storyboard-<slug>.png
  score <film dir | score.mjs>                  Synthesize a film's sound effects (over the user's track, if any)
                                                → WAV (−14 LUFS), cues.json, beats.json
  beats <audio> [--beats n] [--band low|full] [--bpm 90-180] [--out file]
                                                Measure the beat grid of any track
  master <audio> [--out file.wav] [--lufs -14]  Loudness-normalise a supplied track
  skills list                                   Skills and agents this kit ships
  skills install [--scope project|user] [--no-claude] [--force]
                                                Install skills and agents into .agents/ (+ .claude/ links)
  doctor                                        Check Node, the render browser and the project setup
  --version, --help
`;

/** Runs one of the kit's scripts with the user's project as the working directory. */
function runScript(rel, args) {
  const result = spawnSync(process.execPath, [path.join(KIT, rel), ...args], { stdio: "inherit", cwd: process.cwd() });
  process.exit(result.status ?? 1);
}

const [cmd, sub, ...rest] = process.argv.slice(2);
const args = [sub, ...rest].filter((a) => a !== undefined);

switch (cmd) {
  case "init":
  case "update": {
    const { init } = await import("../commands/init.mjs");
    await init({ kit: KIT, version: VERSION, args: cmd === "update" ? ["--update", ...args] : args });
    break;
  }
  case "brand":
    if (sub === "capture") runScript("brand/capture.mjs", rest);
    else if (sub === "guide") runScript("brand/style-guide.mjs", rest);
    else fail("usage: motion-kit brand capture <url> | brand guide <domain>");
    break;
  case "render": {
    const core = await import("../lib/render-core.mjs");
    const opts = core.options(args);
    if (!opts._[0]) fail("usage: motion-kit render <composition> [--crf n] [--out file] [--props json] [--animatic]");
    // An animatic: the whole film at half size, for checking timing and sound before the full render.
    const animatic = opts.animatic === true;
    const out = await core.film(opts._[0], {
      out: opts.out ?? (animatic ? `out/${opts._[0]}-animatic.mp4` : undefined),
      crf: opts.crf ? Number(opts.crf) : animatic ? 23 : undefined,
      scale: animatic ? 0.5 : 1,
      inputProps: opts.props ? JSON.parse(opts.props) : {},
    });
    console.log(out);
    break;
  }
  case "still": {
    const core = await import("../lib/render-core.mjs");
    const opts = core.options(args);
    if (opts._.length < 2) fail("usage: motion-kit still <composition> <frame> [--scale n] [--props json]");
    console.log(await core.still(opts._[0], Number(opts._[1]), { scale: opts.scale ? Number(opts.scale) : 1, inputProps: opts.props ? JSON.parse(opts.props) : {} }));
    break;
  }
  case "frames":
    if (!sub || !rest[0]) fail("usage: motion-kit frames <composition> <f,f,…>");
    runScript("render.mjs", ["frames", sub, rest[0]]);
    break;
  case "sheet": {
    const { sheet } = await import("../commands/sheet.mjs");
    await sheet(args);
    break;
  }
  case "storyboard": {
    const { storyboard } = await import("../commands/storyboard.mjs");
    await storyboard(args);
    break;
  }
  case "filter": {
    const { filter } = await import("../commands/filter.mjs");
    await filter(args);
    break;
  }
  case "verify": {
    const { verify } = await import("../commands/verify.mjs");
    verify(args);
    break;
  }
  case "reference": {
    const { reference } = await import("../commands/reference.mjs");
    await reference(args);
    break;
  }
  case "new-film": {
    const { newFilm } = await import("../commands/film.mjs");
    newFilm(args);
    break;
  }
  case "score":
  case "beats":
  case "master": {
    const audio = await import("../commands/score.mjs");
    await audio[cmd](args);
    break;
  }
  case "skills": {
    const skills = await import("../commands/skills.mjs");
    if (sub === "list") skills.list(KIT);
    else if (sub === "install") skills.install(KIT, rest);
    else fail("usage: motion-kit skills list | skills install [--scope project|user] [--no-claude] [--force]");
    break;
  }
  case "doctor": {
    const { doctor } = await import("../commands/doctor.mjs");
    await doctor(KIT, VERSION);
    break;
  }
  case "--version":
  case "-v":
    console.log(VERSION);
    break;
  case undefined:
  case "--help":
  case "-h":
  case "help":
    console.log(HELP);
    break;
  default:
    fail(`unknown command "${cmd}"\n\n${HELP}`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
