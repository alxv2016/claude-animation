// motion-kit skills: lists and installs the kit's portable skills and agents.
// Canonical home is .agents/ (any tool); Claude Code finds them through symlinks in .claude/.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BLOCK_START = "<!-- motion-kit:skills:start -->";
const BLOCK_END = "<!-- motion-kit:skills:end -->";

/** name and description from a SKILL.md or agent file's front matter. */
function frontMatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const fm = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
  const field = (key) => {
    const m = new RegExp(`^${key}:\\s*(>-?|\\|)?\\s*\\n?([\\s\\S]*?)(?=\\n\\w[\\w-]*:|$)`, "m").exec(fm);
    return m ? m[2].replace(/\s*\n\s*/g, " ").replace(/^["']|["']$/g, "").trim() : "";
  };
  return { name: field("name"), description: field("description") };
}

function catalog(kit) {
  const skillsDir = path.join(kit, ".agents/skills");
  const agentsDir = path.join(kit, ".agents/agents");
  // Skills another installer put here (`npx skills add` records them in skills-lock.json) are not the kit's.
  const lock = path.join(kit, "skills-lock.json");
  const foreign = new Set(fs.existsSync(lock) ? Object.keys(JSON.parse(fs.readFileSync(lock, "utf8")).skills ?? {}) : []);
  const skills = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir).filter((d) => !foreign.has(d) && fs.existsSync(path.join(skillsDir, d, "SKILL.md"))).map((d) => ({ dir: d, ...frontMatter(path.join(skillsDir, d, "SKILL.md")) }))
    : [];
  const agents = fs.existsSync(agentsDir)
    ? fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).map((f) => ({ file: f, ...frontMatter(path.join(agentsDir, f)) }))
    : [];
  return { skillsDir, agentsDir, skills, agents };
}

export function list(kit) {
  const { skills, agents } = catalog(kit);
  console.log("Skills");
  for (const s of skills) console.log(`  ${s.name.padEnd(22)} ${s.description}`);
  console.log("Agents");
  if (!agents.length) console.log("  (none yet)");
  for (const a of agents) console.log(`  ${a.name.padEnd(22)} ${a.description}`);
}

export function install(kit, args) {
  const scope = args.includes("--scope") ? args[args.indexOf("--scope") + 1] : "project";
  const claude = !args.includes("--no-claude");
  const force = args.includes("--force");
  if (!["project", "user"].includes(scope)) throw new Error(`--scope must be project or user, not ${scope}`);
  const base = scope === "user" ? os.homedir() : process.cwd();
  const { skillsDir, agentsDir, skills, agents } = catalog(kit);
  const targetSkills = path.join(base, ".agents/skills");
  const targetAgents = path.join(base, ".agents/agents");
  const self = path.resolve(targetSkills) === path.resolve(skillsDir); // installing into the kit repo itself
  const report = [];

  for (const s of skills) {
    const dest = path.join(targetSkills, s.dir);
    if (!self) {
      if (fs.existsSync(dest) && !force) report.push(`skip    .agents/skills/${s.dir} (exists; --force to replace)`);
      else {
        fs.rmSync(dest, { recursive: true, force: true });
        fs.cpSync(path.join(skillsDir, s.dir), dest, { recursive: true });
        report.push(`copy    .agents/skills/${s.dir}`);
      }
    }
    if (claude) link(dest, path.join(base, ".claude/skills", s.dir), scope, report);
  }
  for (const a of agents) {
    const dest = path.join(targetAgents, a.file);
    if (!self) {
      if (fs.existsSync(dest) && !force) report.push(`skip    .agents/agents/${a.file} (exists)`);
      else {
        fs.mkdirSync(targetAgents, { recursive: true });
        fs.copyFileSync(path.join(agentsDir, a.file), dest);
        report.push(`copy    .agents/agents/${a.file}`);
      }
    }
    if (claude) link(dest, path.join(base, ".claude/agents", a.file), scope, report);
  }
  if (scope === "project") indexInAgentsMd(base, skills, agents, report);
  console.log(report.join("\n") || "nothing to do");
}

/** Claude Code reads .claude/, not .agents/: link each item so both stay one copy. */
function link(target, linkPath, scope, report) {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  const stat = fs.lstatSync(linkPath, { throwIfNoEntry: false });
  if (stat && !stat.isSymbolicLink()) return report.push(`skip    ${display(linkPath)} (a real file or folder is there)`);
  if (stat) fs.unlinkSync(linkPath);
  // Relative inside a project so the repo can move; absolute for the user profile.
  const to = scope === "project" ? path.relative(path.dirname(linkPath), target) : target;
  fs.symlinkSync(to, linkPath);
  report.push(`link    ${display(linkPath)} → ${to}`);
}

/** Tools without skill discovery learn about the skills from AGENTS.md; the block is regenerated each install. */
function indexInAgentsMd(base, skills, agents, report) {
  const file = path.join(base, "AGENTS.md");
  const rows = [
    BLOCK_START,
    "## motion-kit skills and agents",
    "",
    "Installed by `npx motion-kit skills install`. Each skill is `.agents/skills/<name>/SKILL.md`: read it",
    "when a task matches its description, and follow it. Agents in `.agents/agents/` are role prompts.",
    "",
    "Remotion's own skills (`npx skills add remotion-dev/skills`), if installed, cover Remotion's API. Where",
    "they and these skills disagree on timing, look or sound, these skills and their studio rules win.",
    "",
    "| Skill | Use when |",
    "| --- | --- |",
    ...skills.map((s) => `| [\`${s.name}\`](.agents/skills/${s.dir}/SKILL.md) | ${s.description} |`),
    ...(agents.length ? ["", "| Agent | Use when |", "| --- | --- |", ...agents.map((a) => `| [\`${a.name}\`](.agents/agents/${a.file}) | ${a.description} |`)] : []),
    BLOCK_END,
  ].join("\n");
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const next = existing.includes(BLOCK_START)
    ? existing.replace(new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`), rows)
    : `${existing ? existing.trimEnd() + "\n\n" : ""}${rows}\n`;
  fs.writeFileSync(file, next);
  report.push(`update  AGENTS.md (skills index)`);
}

const display = (p) => p.replace(os.homedir(), "~").replace(process.cwd() + path.sep, "");
