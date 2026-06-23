#!/usr/bin/env npx tsx
/**
 * Generates skills/INDEX.json: a machine-readable catalog of every
 * skills/walkeros-<name>/SKILL.md (frontmatter, category, resources, related
 * skills). The drift gate (validate-skills-index.ts) imports `buildIndex` and
 * compares it to the committed file, so editing INDEX.json by hand without
 * regenerating fails CI.
 * Usage: npx tsx apps/scripts/generate-skills-index.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { glob } from 'glob';
import { join, relative } from 'path';
import matter from 'gray-matter';

// SKILL.md frontmatter is the Claude skill-plugin format: top-level `key:`
// entries whose value may fold across indented continuation lines (and may
// contain unquoted colons, e.g. "workflow: research ..."). That is intentional
// for the skill loader but not valid strict YAML, so js-yaml (gray-matter's
// default engine) throws. This tolerant engine reads exactly that shape: a key
// at column 0, then any deeper-indented lines joined with single spaces.
function parseFrontmatter(input: string): Record<string, string> {
  const out: Record<string, string> = {};
  let key: string | null = null;
  const parts: string[] = [];

  const flush = (): void => {
    if (key !== null) out[key] = parts.join(' ').replace(/\s+/g, ' ').trim();
    parts.length = 0;
  };

  for (const raw of input.split('\n')) {
    if (raw.trim() === '') continue;
    const top = raw.match(/^([A-Za-z][\w-]*):\s?(.*)$/);
    const indented = /^\s+/.test(raw);
    if (top && !indented) {
      flush();
      key = top[1];
      parts.push(top[2]);
    } else if (key !== null) {
      parts.push(raw.trim());
    }
  }
  flush();
  return out;
}

const ROOT = process.cwd();

export type SkillCategory = 'understanding' | 'using' | 'create' | 'task';

export interface SkillEntry {
  name: string;
  description: string;
  category: SkillCategory;
  path: string;
  url: string;
  resources: string[];
  related: string[];
}

export interface SkillsIndex {
  $generated: string;
  version: string;
  count: number;
  skills: SkillEntry[];
}

const GENERATED_NOTE =
  'Generated file. Do not edit by hand. Regenerate via: npm run generate:skills-index';

// Category is derived from the skill-name prefix. `understanding-*`, `using-*`,
// and `create-*` are the three documented families; anything else (e.g.
// debugging, mapping-configuration, testing-strategy) is a task skill.
function categoryFor(name: string): SkillCategory {
  if (name.startsWith('understanding-')) return 'understanding';
  if (name.startsWith('using-')) return 'using';
  if (name.startsWith('create-')) return 'create';
  return 'task';
}

// Recursively list every file under the skill directory, relative to that
// directory, excluding SKILL.md (the index already records it via `path`) and
// .DS_Store noise. Includes nested examples/* and templates/* plus sibling docs
// like value-strategies.md and TESTING.md. Sorted for a stable artifact.
function listResources(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current)) {
      if (entry === '.DS_Store') continue;
      const abs = join(current, entry);
      const rel = relative(dir, abs);
      if (statSync(abs).isDirectory()) {
        walk(abs);
      } else if (rel !== 'SKILL.md') {
        out.push(rel);
      }
    }
  };
  walk(dir);
  return out.sort();
}

// Extract related skill names from the body. We read the regions under the
// `## Related Skills` and `## Prerequisites` headings (case-insensitive: one
// skill uses lowercase `## Related skills`), stopping at the next heading of the
// same-or-higher level, then pull the bare skill name out of every
// `../walkeros-<name>/SKILL.md` relative link. Deduped and sorted.
function parseRelated(body: string): string[] {
  const lines = body.split('\n');
  const related = new Set<string>();
  const linkRegex = /\.\.\/(walkeros-[a-z0-9-]+)\/SKILL\.md/g;

  let capturing = false;
  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const title = heading[2].trim().toLowerCase();
      capturing = title === 'related skills' || title === 'prerequisites';
      continue;
    }
    if (!capturing) continue;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(line)) !== null) {
      related.add(match[1]);
    }
  }

  return [...related].sort();
}

function readPluginVersion(): string {
  const abs = join(ROOT, '.claude-plugin', 'plugin.json');
  const plugin: unknown = JSON.parse(readFileSync(abs, 'utf-8'));
  if (
    typeof plugin !== 'object' ||
    plugin === null ||
    !('version' in plugin) ||
    typeof (plugin as { version: unknown }).version !== 'string'
  ) {
    throw new Error('.claude-plugin/plugin.json has no string "version" field');
  }
  return (plugin as { version: string }).version;
}

export function buildIndex(): SkillsIndex {
  const files = glob
    .sync('skills/walkeros-*/SKILL.md', { cwd: ROOT, absolute: true })
    .sort();

  const skills: SkillEntry[] = files.map((file) => {
    const dir = join(file, '..');
    const dirName = relative(join(ROOT, 'skills'), dir);
    const parsed = matter(readFileSync(file, 'utf-8'), {
      engines: { yaml: parseFrontmatter },
    });
    const data: { name?: unknown; description?: unknown } = parsed.data;

    if (typeof data.name !== 'string') {
      throw new Error(`${dirName}/SKILL.md: frontmatter "name" missing`);
    }
    if (typeof data.description !== 'string') {
      throw new Error(`${dirName}/SKILL.md: frontmatter "description" missing`);
    }
    if (data.name !== dirName) {
      throw new Error(
        `${dirName}/SKILL.md: frontmatter name "${data.name}" !== directory "${dirName}"`,
      );
    }

    const description = data.description.replace(/\s+/g, ' ').trim();
    const name = data.name;

    return {
      name,
      description,
      category: categoryFor(name.replace(/^walkeros-/, '')),
      path: `skills/${name}/SKILL.md`,
      url: `https://www.walkeros.io/skills/${name}`,
      resources: listResources(dir),
      related: parseRelated(parsed.content),
    };
  });

  skills.sort((a, b) => a.name.localeCompare(b.name));

  return {
    $generated: GENERATED_NOTE,
    version: readPluginVersion(),
    count: skills.length,
    skills,
  };
}

function main(): void {
  const index = buildIndex();
  const outPath = join(ROOT, 'skills', 'INDEX.json');
  writeFileSync(outPath, `${JSON.stringify(index, null, 2)}\n`, 'utf-8');
  console.log(
    `✅ Wrote ${relative(ROOT, outPath)} (${index.count} skills, version ${index.version}).`,
  );
}

// Only write when run directly, so the drift gate can import buildIndex without
// side effects. tsx transpiles this module to CommonJS, so `require.main`
// identifies the entry point.
if (require.main === module) {
  main();
}
