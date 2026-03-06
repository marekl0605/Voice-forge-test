import fs from "fs";
import path from "path";

const skillsDir = path.join(process.cwd(), "src", "skills");
const skillCache = new Map<string, string>();

export function loadSkill(name: string): string {
  if (skillCache.has(name)) {
    return skillCache.get(name)!;
  }

  const filePath = path.join(skillsDir, `${name}.md`);
  const content = fs.readFileSync(filePath, "utf-8");
  skillCache.set(name, content);
  return content;
}

export function loadSkills(...names: string[]): string {
  return names.map(loadSkill).join("\n\n---\n\n");
}
