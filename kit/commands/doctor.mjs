// motion-kit doctor: checks what renders and captures need, and says how to fix what's missing.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export async function doctor(kit, version) {
  const root = process.cwd();
  const checks = [];
  const add = (ok, label, fix) => checks.push(`${ok ? "ok  " : "FIX "} ${label}${ok || !fix ? "" : `\n       → ${fix}`}`);

  const [major] = process.versions.node.split(".").map(Number);
  add(major >= 20, `Node ${process.versions.node} (needs 20+)`, "install Node 20 or newer");
  add(true, `motion-kit ${version} at ${kit}`);

  try {
    const { ensureBrowser } = await import("@remotion/renderer");
    const status = await ensureBrowser();
    add("path" in status, `render browser: ${status.type}`, "network access is needed once to download Chrome Headless Shell");
  } catch (e) {
    add(false, `render browser: ${e.message.split("\n")[0]}`, "npm install in the kit or project");
  }

  const ffmpeg = spawnSync("npx", ["remotion", "ffmpeg", "-version"], { cwd: fs.existsSync(path.join(root, "node_modules/@remotion/cli")) ? root : kit, encoding: "utf8" });
  add(ffmpeg.status === 0, "ffmpeg (Remotion's bundled build, via `npx remotion ffmpeg`)", "npm install; the system ffmpeg is not used");

  const has = (rel) => fs.existsSync(path.join(root, rel));
  add(has("src/index.ts"), "Remotion entry src/index.ts", "npx motion-kit init");
  add(has("src/motion-kit/effects") || path.resolve(root) === path.resolve(kit), "kit library in src/motion-kit/", "npx motion-kit init");
  const config = has("remotion.config.ts") ? fs.readFileSync(path.join(root, "remotion.config.ts"), "utf8") : "";
  add(config.includes('"angle"'), "remotion.config.ts sets the angle GL renderer", 'add Config.setChromiumOpenGlRenderer("angle")');
  add(has(".agents/skills"), "skills installed in .agents/skills", "npx motion-kit skills install");

  console.log(checks.join("\n"));
}
