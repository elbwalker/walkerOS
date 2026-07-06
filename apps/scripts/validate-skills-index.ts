#!/usr/bin/env npx tsx
/**
 * Drift gate for skills/INDEX.json. Regenerates the index in memory and asserts
 * it matches the committed file, that the index and the plugin manifest list
 * the same skills, and that every resource/related reference resolves on disk.
 * Usage: npx tsx apps/scripts/validate-skills-index.ts
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { buildIndex, type SkillsIndex } from './generate-skills-index';

interface Issue {
  message: string;
}

const ROOT = process.cwd();
const issues: Issue[] = [];

function readCommittedIndex(): SkillsIndex | null {
  const abs = join(ROOT, 'skills', 'INDEX.json');
  if (!existsSync(abs)) {
    issues.push({
      message:
        'skills/INDEX.json is missing. Run `npm run generate:skills-index`.',
    });
    return null;
  }
  return JSON.parse(readFileSync(abs, 'utf-8')) as SkillsIndex;
}

function readPluginSkillNames(): string[] {
  const abs = join(ROOT, '.claude-plugin', 'plugin.json');
  const plugin = JSON.parse(readFileSync(abs, 'utf-8')) as {
    skills?: string[];
  };
  const skills = plugin.skills ?? [];
  // Entries look like "skills/walkeros-using-cli"; reduce to the basename.
  return skills.map((entry) => entry.replace(/^skills\//, ''));
}

// 1. Regenerate-and-compare: a hand edit to INDEX.json that was not produced by
//    the generator fails here.
function checkInMemoryMatchesCommitted(committed: SkillsIndex): void {
  const fresh = buildIndex();
  if (JSON.stringify(fresh) !== JSON.stringify(committed)) {
    issues.push({
      message:
        'skills/INDEX.json is stale or hand-edited. Run `npm run generate:skills-index` to regenerate.',
    });
  }
}

// 2. The index skill set and the plugin manifest skill set must be identical in
//    both directions.
function checkPluginParity(committed: SkillsIndex): void {
  const indexNames = new Set(committed.skills.map((s) => s.name));
  const pluginNames = new Set(readPluginSkillNames());

  for (const name of indexNames) {
    if (!pluginNames.has(name)) {
      issues.push({
        message: `"${name}" is in INDEX.json but not in .claude-plugin/plugin.json skills[].`,
      });
    }
  }
  for (const name of pluginNames) {
    if (!indexNames.has(name)) {
      issues.push({
        message: `"${name}" is in .claude-plugin/plugin.json skills[] but not in INDEX.json.`,
      });
    }
  }
}

// 3. Every listed resource file exists, and every related skill resolves to an
//    existing skills/<name>/SKILL.md.
function checkReferencesResolve(committed: SkillsIndex): void {
  for (const skill of committed.skills) {
    const skillDir = join(ROOT, 'skills', skill.name);
    for (const resource of skill.resources) {
      if (!existsSync(join(skillDir, resource))) {
        issues.push({
          message: `${skill.name}: resource "${resource}" does not exist.`,
        });
      }
    }
    for (const related of skill.related) {
      if (!existsSync(join(ROOT, 'skills', related, 'SKILL.md'))) {
        issues.push({
          message: `${skill.name}: related skill "${related}" has no skills/${related}/SKILL.md.`,
        });
      }
    }
  }
}

function main(): void {
  console.log('🧭 Validating skills/INDEX.json...\n');

  const committed = readCommittedIndex();
  if (committed) {
    checkInMemoryMatchesCommitted(committed);
    checkPluginParity(committed);
    checkReferencesResolve(committed);
  }

  if (issues.length === 0) {
    console.log('✅ skills/INDEX.json is in sync!\n');
    process.exit(0);
  }

  console.log(`❌ Found ${issues.length} skills index issues:\n`);
  for (const issue of issues) {
    console.log(`  ${issue.message}`);
  }
  console.log('');
  process.exit(1);
}

main();
