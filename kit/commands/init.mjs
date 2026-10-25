// motion-kit init / update: sets up Remotion in the current project and vendors the kit's
// Remotion-side library into src/motion-kit/, where the project owns and can edit it.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Kit source folders copied into the project, as [from (kit-relative), to (project-relative)]. */
const LIBRARY = [
  ["src/effects", "src/motion-kit/effects"],
  ["src/brand", "src/motion-kit/brand"],
  ["src/lib", "src/motion-kit/lib"],
];
/** Kit-repo files that depend on the reel; the glass demos in showcase/ ship as examples. */
const SKIP = new Set(["EffectsShowcase.tsx"]);
const DEFAULT_KIT_SPEC = "github:alxv2016/claude-animation";
const GITIGNORE = ["node_modules", "out", "public/brands/*/fonts/", "public/.motion-kit/"];

export async function init({ kit, version, args }) {
  const force = args.includes("--force");
  const update = args.includes("--update");
  const install = args.includes("--install");
  const specAt = args.indexOf("--kit");
  const kitSpec = specAt >= 0 ? args[specAt + 1] : DEFAULT_KIT_SPEC;
  const root = process.cwd();
  if (path.resolve(root) === path.resolve(kit)) {
    console.log("This is the motion-kit repo itself; nothing to set up.");
    return;
  }
  const report = [];
  const write = (rel, content, overwrite = force) => {
    const file = path.join(root, rel);
    if (fs.existsSync(file) && !overwrite) return report.push(`skip    ${rel} (exists)`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    report.push(`write   ${rel}`);
  };

  // Library: always refreshed by `update`; by `init` only when missing or with --force.
  const header = `// Vendored from motion-kit ${version}. Refresh with \`npx motion-kit update\`; local edits are overwritten.\n`;
  for (const [from, to] of LIBRARY) {
    for (const file of walk(path.join(kit, from))) {
      const rel = path.relative(path.join(kit, from), file);
      if (SKIP.has(path.basename(rel))) continue;
      const body = fs.readFileSync(file, "utf8");
      write(path.join(to, rel), /\.tsx?$/.test(rel) ? header + body : body, force || update);
    }
  }

  if (!update) {
    for (const file of walk(path.join(kit, "kit/templates/project"))) {
      const rel = path.relative(path.join(kit, "kit/templates/project"), file);
      write(rel, fs.readFileSync(file, "utf8"));
    }
    mergePackageJson(root, kit, kitSpec, report);
    const ignore = path.join(root, ".gitignore");
    const existing = fs.existsSync(ignore) ? fs.readFileSync(ignore, "utf8").split("\n") : [];
    const missing = GITIGNORE.filter((l) => !existing.includes(l));
    if (missing.length) {
      fs.writeFileSync(ignore, [...existing.filter(Boolean), ...missing].join("\n") + "\n");
      report.push(`update  .gitignore (+${missing.join(", ")})`);
    }
  }

  console.log(report.join("\n"));
  if (update) return;
  if (install) {
    const r = spawnSync("npm", ["install"], { stdio: "inherit", cwd: root });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
  console.log(`\nNext:${install ? "" : "\n  npm install"}\n  npx motion-kit skills install\n  npm run dev        # Remotion Studio, composition "Hello"`);
}

function mergePackageJson(root, kit, kitSpec, report) {
  const file = path.join(root, "package.json");
  const kitPkg = JSON.parse(fs.readFileSync(path.join(kit, "package.json"), "utf8"));
  const pkg = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { name: path.basename(root), private: true };
  pkg.type ??= "module";
  pkg.scripts = { dev: "remotion studio", typecheck: "tsc --noEmit", ...pkg.scripts };
  // Remotion packages must share one exact version with the kit's renderer.
  pkg.dependencies = { ...pkg.dependencies, ...pickRemotion(kitPkg.dependencies) };
  pkg.devDependencies = {
    ...pkg.devDependencies,
    "motion-kit": kitSpec,
    typescript: kitPkg.devDependencies.typescript,
    "@types/react": kitPkg.devDependencies["@types/react"],
  };
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
  report.push(`update  package.json (Remotion ${kitPkg.dependencies.remotion}, motion-kit ${kitSpec})`);
}

const pickRemotion = (deps) => Object.fromEntries(Object.entries(deps).filter(([k]) => k === "remotion" || k.startsWith("@remotion/") || k === "react" || k === "react-dom"));

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name !== ".DS_Store") yield full;
  }
}
