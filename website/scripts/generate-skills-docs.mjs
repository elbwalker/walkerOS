#!/usr/bin/env node
// Build-time generator: turn the repo's skills/<name>/SKILL.md files into
// Docusaurus pages under website/skills-generated/. SKILL.md is the single
// source of truth; this script never mutates it.
//
// Each page is emitted with `format: md` frontmatter so Docusaurus parses it
// as CommonMark (not MDX). That makes any raw JSX in a SKILL body inert text
// instead of a compiler error, and lets every link be rewritten to either an
// in-site route or a GitHub blob URL (see rewrite-links.mjs).

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rewriteLink } from './rewrite-links.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBSITE_DIR = join(__dirname, '..');
const SKILLS_DIR = join(WEBSITE_DIR, '..', 'skills');
const OUT_DIR = join(WEBSITE_DIR, 'skills-generated');

const CATEGORY_LABELS = {
  understanding: 'Understanding',
  using: 'Using',
  create: 'Creating',
  task: 'Tasks',
};
const CATEGORY_ORDER = ['understanding', 'using', 'create', 'task'];

// Humanize a skill dir name into a page title:
//   walkeros-understanding-flow -> Understanding Flow
function humanize(name) {
  return name
    .replace(/^walkeros-/, '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Split a SKILL.md into its YAML frontmatter block and the markdown body.
function splitFrontmatter(raw) {
  if (!raw.startsWith('---')) return { frontmatter: '', body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { frontmatter: '', body: raw };
  const bodyStart = raw.indexOf('\n', end + 1);
  return {
    frontmatter: raw.slice(3, end).trim(),
    body: raw.slice(bodyStart + 1),
  };
}

// Rewrite every inline markdown link target in the body, skipping fenced code
// blocks (``` ... ```) so example snippets that happen to contain `](...)`
// stay verbatim. A dropped (placeholder) link keeps its text rendered as
// inline code.
function rewriteBody(body, skillName) {
  const lines = body.split('\n');
  let inFence = false;
  let fenceMarker = '';

  const linkRe = /(?<!\!)\[([^\]]*)\]\(([^)\s]+)\)/g;

  const out = lines.map((line) => {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      // Preserve the opening fence's exact length. A 4-backtick fence must stay
      // open until another 4+-backtick line, so collapsing every opener to three
      // characters would close it on the first inner ``` and start rewriting
      // links inside the example.
      const marker = fenceMatch[1];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (line.trimStart().startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = '';
      }
      return line;
    }
    if (inFence) return line;

    // Even in `format: md`, Docusaurus passes JSX/expression nodes through
    // rehype-raw (passThrough), so a BARE `<Component .../>` or `{expression}`
    // outside a code fence is still resolved as an MDX component and throws at
    // SSG time. JSX inside inline-code spans is already safe (escaped), so we
    // only neutralize lines that still hold a bare JSX tag after stripping
    // code spans. Escaping `<`/`>`/`{`/`}` renders them as literal text under
    // rehype-raw without changing the documentation's meaning.
    const withoutCode = line.replace(/`[^`]*`/g, '');
    if (/<\/?[A-Z][A-Za-z0-9]*[\s/>]/.test(withoutCode)) {
      return line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\{/g, '&#123;')
        .replace(/\}/g, '&#125;');
    }

    return line.replace(linkRe, (match, text, target) => {
      const { href, drop } = rewriteLink(target, skillName);
      if (drop) return `\`${text}\``;
      return `[${text}](${href})`;
    });
  });

  return out.join('\n');
}

// Escape YAML scalar values used in frontmatter (title/description).
function yamlString(value) {
  return JSON.stringify(value);
}

function loadIndex() {
  const raw = readFileSync(join(SKILLS_DIR, 'INDEX.json'), 'utf-8');
  return JSON.parse(raw).skills;
}

function buildIndexPage(skills) {
  const byCategory = new Map();
  for (const skill of skills) {
    const list = byCategory.get(skill.category) || [];
    list.push(skill);
    byCategory.set(skill.category, list);
  }

  let body = '# walkerOS Skills\n\n';
  body +=
    'Skills are the source of truth for working with walkerOS. Each page below ' +
    'is generated from the matching `skills/<name>/SKILL.md` in the repository.\n';

  for (const category of CATEGORY_ORDER) {
    const list = byCategory.get(category);
    if (!list || list.length === 0) continue;
    body += `\n## ${CATEGORY_LABELS[category] || category}\n\n`;
    for (const skill of list) {
      const title = humanize(skill.name);
      body += `- [${title}](/skills/${skill.name}) — ${skill.description}\n`;
    }
  }

  const frontmatter = [
    '---',
    `title: ${yamlString('walkerOS Skills')}`,
    `description: ${yamlString('Index of walkerOS skills, the source of truth for AI assistants and developers.')}`,
    'slug: /',
    'format: md',
    '---',
    '',
  ].join('\n');

  return frontmatter + body;
}

function main() {
  const index = loadIndex();
  const byName = new Map(index.map((s) => [s.name, s]));

  // Fresh output dir each run so deletions in source propagate.
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('walkeros-'))
    .map((d) => d.name)
    .sort();

  let count = 0;
  for (const name of skillDirs) {
    const skillPath = join(SKILLS_DIR, name, 'SKILL.md');
    let raw;
    try {
      raw = readFileSync(skillPath, 'utf-8');
    } catch {
      continue; // not a skill dir (no SKILL.md)
    }

    const { body } = splitFrontmatter(raw);
    const rewritten = rewriteBody(body, name);

    const meta = byName.get(name);
    const title = humanize(name);
    const description = meta
      ? meta.description
      : `walkerOS skill: ${title}.`;

    const frontmatter = [
      '---',
      `title: ${yamlString(title)}`,
      `description: ${yamlString(description)}`,
      `slug: /${name}`,
      'format: md',
      '---',
      '',
    ].join('\n');

    writeFileSync(join(OUT_DIR, `${name}.md`), frontmatter + rewritten);
    count += 1;
  }

  writeFileSync(join(OUT_DIR, 'index.md'), buildIndexPage(index));

  console.log(
    `Generated ${count} skill pages + index into ${join('website', 'skills-generated')}`,
  );
}

main();
