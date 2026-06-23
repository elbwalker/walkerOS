#!/usr/bin/env npx tsx
/**
 * Validates the LLM-friendly Markdown export emitted into website/build by the
 * docusaurus-plugin-llms-txt plugin. Run after the website build.
 * Usage: npx tsx apps/scripts/validate-llms.ts
 *
 * No-ops cleanly when website/build/llms.txt is absent (e.g. unit-test-only
 * runs that never built the site), but asserts in CI where the build precedes
 * validation.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

interface Issue {
  file: string;
  message: string;
}

const ROOT = process.cwd();
const BUILD_DIR = join(ROOT, 'website', 'build');
const LLMS_INDEX = join(BUILD_DIR, 'llms.txt');

const issues: Issue[] = [];

// Extract the link targets from `[text](target)` pairs, keeping only the
// root-relative Markdown pages the plugin emits (e.g. `/docs/...md`,
// `/docs.md`). External URLs, anchors, and non-.md targets are not part of the
// export contract this guard protects.
function extractMarkdownLinks(content: string): string[] {
  const links: string[] = [];
  const regex = /\[[^\]]*\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const target = match[1].split('#')[0];
    if (target.startsWith('/') && target.endsWith('.md')) {
      links.push(target);
    }
  }
  return links;
}

function checkIndexLinks(): void {
  const content = readFileSync(LLMS_INDEX, 'utf-8');
  const links = extractMarkdownLinks(content);

  if (links.length === 0) {
    issues.push({
      file: 'website/build/llms.txt',
      message:
        'llms.txt references no .md pages (export produced an empty index)',
    });
    return;
  }

  for (const link of links) {
    // Root-relative link → file under website/build (strip the leading slash).
    const abs = join(BUILD_DIR, link.slice(1));
    if (!existsSync(abs)) {
      issues.push({
        file: 'website/build/llms.txt',
        message: `referenced page not emitted: ${link} (expected ${relative(ROOT, abs)})`,
      });
    }
  }
}

// Regression guard: the amplitude destination page must export BOTH the install
// command (proves code blocks survive) AND a data-driven configuration table
// (proves the Explorer-rendered config table is captured, not just prose). If
// either disappears, the SSR/plugin export has silently degraded.
function checkAmplitudeExport(): void {
  const rel = 'website/build/docs/destinations/web/amplitude.md';
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    issues.push({
      file: rel,
      message: 'amplitude destination page not emitted to the Markdown export',
    });
    return;
  }

  const content = readFileSync(abs, 'utf-8');

  if (!content.includes('npm install @walkeros/web-destination-amplitude')) {
    issues.push({
      file: rel,
      message:
        'missing install command "npm install @walkeros/web-destination-amplitude" (code export degraded)',
    });
  }

  // A configuration table row carries the `apiKey` setting inside a Markdown
  // table cell. Require both the token and a table pipe on the same line so a
  // stray prose mention of apiKey can't satisfy the guard.
  const hasConfigTable = content
    .split('\n')
    .some((line) => line.includes('|') && line.includes('apiKey'));
  if (!hasConfigTable) {
    issues.push({
      file: rel,
      message:
        'missing configuration table row for `apiKey` (data-driven table export degraded)',
    });
  }
}

// The /skills surface is single-sourced from skills/<name>/SKILL.md by the
// website generator. Guard that every SKILL.md became a page and that link
// rewriting + content survived the build (one heading + one GitHub blob link).
function checkSkillsExport(): void {
  const skillsBuildDir = join(BUILD_DIR, 'skills');
  if (!existsSync(skillsBuildDir)) {
    issues.push({
      file: 'website/build/skills',
      message:
        'skills route not emitted to the build (generator or plugin failed)',
    });
    return;
  }

  // (a) Coverage: one emitted .md per SKILL.md (index.md excluded).
  const skillsSrcDir = join(ROOT, 'skills');
  const sourceSkills = readdirSync(skillsSrcDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('walkeros-'))
    .filter((d) => existsSync(join(skillsSrcDir, d.name, 'SKILL.md')))
    .map((d) => d.name);

  const emitted = readdirSync(skillsBuildDir)
    .filter((f) => f.endsWith('.md') && f !== 'index.md')
    .map((f) => f.replace(/\.md$/, ''));

  if (emitted.length !== sourceSkills.length) {
    issues.push({
      file: 'website/build/skills',
      message: `skill page count mismatch: ${sourceSkills.length} SKILL.md in repo, ${emitted.length} emitted .md pages`,
    });
  }
  for (const name of sourceSkills) {
    if (!emitted.includes(name)) {
      issues.push({
        file: 'website/build/skills',
        message: `skill not emitted: ${name}.md missing from website/build/skills/`,
      });
    }
  }

  // (b) Content survival: a known skill page keeps a heading AND a rewritten
  // GitHub blob link (proves the body + link rewriter survived the build).
  const rel = 'website/build/skills/walkeros-understanding-flow.md';
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    issues.push({
      file: rel,
      message:
        'understanding-flow skill page not emitted to the Markdown export',
    });
    return;
  }
  const content = readFileSync(abs, 'utf-8');
  if (!content.includes('# Understanding walkerOS Flow')) {
    issues.push({
      file: rel,
      message:
        'missing known heading "# Understanding walkerOS Flow" (skill body export degraded)',
    });
  }
  if (!content.includes('https://github.com/elbwalker/walkerOS/blob/main/')) {
    issues.push({
      file: rel,
      message:
        'missing rewritten GitHub blob link (link rewriter output not in export)',
    });
  }
}

function main(): void {
  if (!existsSync(LLMS_INDEX)) {
    console.log(
      '🟡 Skipping LLM export validation: website/build/llms.txt not found (site not built).\n',
    );
    process.exit(0);
  }

  console.log('🤖 Validating LLM Markdown export...\n');

  checkIndexLinks();
  checkAmplitudeExport();
  checkSkillsExport();

  if (issues.length === 0) {
    console.log('✅ LLM Markdown export is complete and intact!\n');
    process.exit(0);
  }

  console.log(`❌ Found ${issues.length} LLM export issues:\n`);
  for (const issue of issues) {
    console.log(`  ${issue.file}`);
    console.log(`    ${issue.message}\n`);
  }

  process.exit(1);
}

main();
