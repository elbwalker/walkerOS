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

// Docusaurus stamps every internal link with the configured baseUrl, while the
// build still emits files relative to website/build. PR previews build with
// DOCUSAURUS_BASEURL=/preview/pr-<n>/, so a link reads /preview/pr-<n>/docs/x.md
// while the file is at website/build/docs/x.md. Strip the prefix so preview and
// production builds resolve identically.
const BASE_URL = (process.env.DOCUSAURUS_BASEURL || '/').replace(/\/*$/, '/');

// The export stamps the site url on every link (`content.relativePaths: false`)
// so llms.txt survives being pasted into a model's context or chunked away from
// the site. Read that url from the Docusaurus config rather than repeating it,
// so the guard and the build cannot disagree on what "absolute" means.
function readSiteUrl(): string {
  const config = readFileSync(
    join(ROOT, 'website', 'docusaurus.config.ts'),
    'utf-8',
  );
  // Top-level config key, two-space indented, so a nested plugin option named
  // `url` can never be picked up instead.
  const match = /^ {2}url: '([^']+)'/m.exec(config);
  if (!match) {
    console.log(
      '❌ LLM export validation failed: no site `url` in website/docusaurus.config.ts.\n',
    );
    process.exit(1);
  }
  return match[1].replace(/\/+$/, '');
}

const SITE_URL = readSiteUrl();

function emittedPath(target: string): string {
  const pathname = target.startsWith(SITE_URL)
    ? target.slice(SITE_URL.length)
    : target;
  const relativeTarget =
    BASE_URL !== '/' && pathname.startsWith(BASE_URL)
      ? pathname.slice(BASE_URL.length)
      : pathname.replace(/^\//, '');
  return join(BUILD_DIR, relativeTarget);
}
const LLMS_INDEX = join(BUILD_DIR, 'llms.txt');
const LLMS_FULL = join(BUILD_DIR, 'llms-full.txt');
const SITEMAP = join(BUILD_DIR, 'sitemap.xml');

// How many issues of one kind to print before summarising the rest.
const MAX_REPORTED_PER_CHECK = 15;

const issues: Issue[] = [];

interface LinkRef {
  target: string;
  line: number;
}

// Every `[text](target)` pair in the document, targets kept verbatim.
function extractLinks(content: string): LinkRef[] {
  const links: LinkRef[] = [];
  const regex = /\[[^\]]*\]\(([^)]+)\)/g;
  content.split('\n').forEach((line, index) => {
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((match = regex.exec(line)) !== null) {
      links.push({ target: match[1], line: index + 1 });
    }
  });
  return links;
}

// The links pointing at the Markdown pages the plugin emits. Targets carry the
// site url (`https://site/docs/...md`); a root-relative one still counts here so
// a stale link gets reported rather than skipped. Off-site URLs, anchors, and
// non-.md targets are not part of the export contract this guard protects.
function extractMarkdownLinks(content: string): LinkRef[] {
  return extractLinks(content)
    .map(({ target, line }) => ({
      target: target.split('#')[0].split('?')[0],
      line,
    }))
    .filter(
      ({ target }) =>
        (target.startsWith('/') || target.startsWith(`${SITE_URL}/`)) &&
        target.endsWith('.md'),
    );
}

// Every emitted Markdown page, relative to website/build.
function collectMarkdownPages(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectMarkdownPages(full, acc);
    else if (entry.name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

function pushCapped(kind: string, found: Issue[]): void {
  for (const issue of found.slice(0, MAX_REPORTED_PER_CHECK))
    issues.push(issue);
  if (found.length > MAX_REPORTED_PER_CHECK) {
    issues.push({
      file: 'website/build',
      message: `${kind}: ${found.length} total, ${found.length - MAX_REPORTED_PER_CHECK} further occurrences not listed`,
    });
  }
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
    // Root-relative link → file under website/build.
    const abs = emittedPath(link.target);
    if (!existsSync(abs)) {
      issues.push({
        file: `website/build/llms.txt:${link.line}`,
        message: `referenced page not emitted: ${link.target} (expected ${relative(ROOT, abs)})`,
      });
    }
  }
}

// llms.txt is read detached from the site: pasted into a model's context, split
// into chunks by a retriever, fetched on its own. A root-relative target has no
// document to resolve against there, so every link the index hands out has to
// carry the origin or it is dead on arrival.
function checkIndexLinksAbsolute(): void {
  // Absolute links are a production-only guarantee. Preview builds emit
  // relative links on purpose: the llms-txt plugin appends the baseUrl to the
  // site url while route paths already carry it, doubling any non-root prefix
  // (see the plugin block in website/docusaurus.config.ts).
  if (BASE_URL !== '/') return;
  const content = readFileSync(LLMS_INDEX, 'utf-8');
  const found = extractLinks(content)
    .filter(({ target }) => !target.startsWith('https://'))
    .map(({ target, line }) => ({
      file: `website/build/llms.txt:${line}`,
      message: `relative link target ${target} (llms.txt links must be fully qualified, e.g. ${SITE_URL}${target.startsWith('/') ? target : `/${target}`})`,
    }));
  pushCapped('relative links in llms.txt', found);
}

// Internal planning documents live under website/docs/plans/. One left there is
// published: it gets a public page, a sitemap entry, and its own section in
// llms.txt, which is the copy every agent reads. Deleting the source file fixes
// one leak; asserting on the published artifacts prevents the next one.
const INTERNAL_ROUTE = /[^\s<>"'()[\]]*\/docs\/plans(?![\w-])[^\s<>"'()[\]]*/g;

function findInternalRoutes(content: string): LinkRef[] {
  const found: LinkRef[] = [];
  let match: RegExpExecArray | null;
  INTERNAL_ROUTE.lastIndex = 0;
  while ((match = INTERNAL_ROUTE.exec(content)) !== null) {
    found.push({
      target: match[0],
      line: content.slice(0, match.index).split('\n').length,
    });
  }
  return found;
}

function checkNoInternalPlans(): void {
  const found: Issue[] = [];

  // The index renders one heading per route category, so a "plans" section
  // means the whole directory shipped, not a single stray page.
  readFileSync(LLMS_INDEX, 'utf-8')
    .split('\n')
    .forEach((line, index) => {
      if (!/^#{1,6}\s+plans\s*$/i.test(line.trim())) return;
      found.push({
        file: `website/build/llms.txt:${index + 1}`,
        message: `internal "${line.trim()}" section published in the LLM export (delete the page from website/docs/plans/)`,
      });
    });

  const artifacts = [
    { rel: 'website/build/llms.txt', abs: LLMS_INDEX, optional: false },
    { rel: 'website/build/llms-full.txt', abs: LLMS_FULL, optional: true },
    { rel: 'website/build/sitemap.xml', abs: SITEMAP, optional: false },
  ];

  for (const { rel, abs, optional } of artifacts) {
    if (!existsSync(abs)) {
      // A guard whose input is missing is a guard that is switched off.
      if (!optional) {
        issues.push({
          file: rel,
          message:
            'not emitted, so the internal-plans check could not run against it',
        });
      }
      continue;
    }
    for (const { target, line } of findInternalRoutes(
      readFileSync(abs, 'utf-8'),
    )) {
      found.push({
        file: `${rel}:${line}`,
        message: `internal plans route published: ${target} (delete the page from website/docs/plans/)`,
      });
    }
  }

  pushCapped('published internal plans', found);
}

// Every internal Markdown link in every emitted page body must resolve to a
// file that was actually emitted. A link the export mangles (most commonly a
// trailing-slash route turned into `/docs/mapping/.md`) 404s for every reader
// that follows it, and nothing else in the pipeline notices.
function checkBodyLinks(pages: string[]): void {
  const found: Issue[] = [];
  const targets = [...pages];
  if (existsSync(LLMS_FULL)) targets.push(LLMS_FULL);

  for (const page of targets) {
    const rel = relative(ROOT, page);
    const content = readFileSync(page, 'utf-8');
    for (const link of extractMarkdownLinks(content)) {
      const abs = emittedPath(link.target);
      if (existsSync(abs)) continue;
      const malformed = /\/\.md$/.test(link.target);
      found.push({
        file: `${rel}:${link.line}`,
        message: malformed
          ? `malformed link target ${link.target} (route ends in a slash; the emitted page is ${link.target.replace(/\/\.md$/, '.md')})`
          : `link target not emitted: ${link.target} (expected ${relative(ROOT, abs)})`,
      });
    }
  }
  pushCapped('malformed or dangling links', found);
}

// Components that only render in the browser leave their loading fallback in
// the export, so the page ships a placeholder where its content should be.
// Pages listed here are known to embed the Monaco-backed live editor, which
// server-renders as `Loading...`; fixing that belongs in the editor component,
// not in this guard. Any OTHER page acquiring a placeholder is a regression.
const KNOWN_CLIENT_ONLY_PAGES = new Set([
  'docs/mapping.md',
  'docs/mapping/rule.md',
  'docs/mapping/value.md',
  'docs/comparisons/dataLayer.md',
]);

function hasPlaceholder(content: string): boolean {
  return content.split('\n').some((line) => line.trim() === 'Loading...');
}

function checkPlaceholders(pages: string[]): void {
  const found: Issue[] = [];
  for (const page of pages) {
    const relToBuild = relative(BUILD_DIR, page);
    if (KNOWN_CLIENT_ONLY_PAGES.has(relToBuild)) continue;
    const rel = relative(ROOT, page);
    readFileSync(page, 'utf-8')
      .split('\n')
      .forEach((line, index) => {
        if (line.trim() === 'Loading...') {
          found.push({
            file: `${rel}:${index + 1}`,
            message:
              'bare "Loading..." placeholder in the export (a client-only component rendered no server content)',
          });
        }
      });
  }
  pushCapped('placeholder content', found);

  // An exemption that outlives its reason is an exemption nobody notices. Once
  // a listed page stops shipping a placeholder, or stops existing, the entry
  // silently suppresses the check for whatever takes its place.
  for (const entry of KNOWN_CLIENT_ONLY_PAGES) {
    const abs = join(BUILD_DIR, entry);
    const reason = !existsSync(abs)
      ? 'the page is no longer emitted'
      : !hasPlaceholder(readFileSync(abs, 'utf-8'))
        ? 'the page no longer contains one'
        : undefined;
    if (!reason) continue;
    issues.push({
      file: 'apps/scripts/validate-llms.ts',
      message: `obsolete KNOWN_CLIENT_ONLY_PAGES entry "${entry}": ${reason}, so delete the entry`,
    });
  }
}

// Indentation inside code blocks survives MDX parsing, rendering and the
// Markdown export. The browser source page carries a nested `startFlow` call
// whose two inner levels must keep their leading spaces; when indentation is
// stripped upstream, every nested snippet on the site flattens with it.
function checkCodeIndentation(): void {
  const rel = 'website/build/docs/sources/web/browser.md';
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    issues.push({
      file: rel,
      message: 'browser source page not emitted to the Markdown export',
    });
    return;
  }

  const lines = readFileSync(abs, 'utf-8').split('\n');
  const expectations: { pattern: RegExp; description: string }[] = [
    { pattern: /^ {2}sources: \{$/, description: '  sources: {' },
    {
      pattern: /^ {4}browser: sourceBrowser,$/,
      description: '    browser: sourceBrowser,',
    },
    { pattern: /^ {2}"browser": \{$/, description: '  "browser": {' },
  ];

  for (const { pattern, description } of expectations) {
    if (lines.some((line) => pattern.test(line))) continue;
    const flattened = lines.findIndex((line) =>
      new RegExp(
        `^\\s*${description.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      ).test(line),
    );
    issues.push({
      file: flattened === -1 ? rel : `${rel}:${flattened + 1}`,
      message:
        flattened === -1
          ? `missing indented code line \`${description}\` (nested snippet not exported)`
          : `code line \`${description.trim()}\` lost its indentation (exported as \`${lines[flattened]}\`)`,
    });
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
    // In CI the website build runs before validation, so a missing llms.txt
    // here means the llms plugin stopped emitting its index (a broken export),
    // not a harmless local no-build run. Fail loudly in that case; only skip
    // when there is genuinely no build (unit-test-only local runs).
    if (existsSync(BUILD_DIR) || process.env.CI === 'true') {
      console.log(
        '❌ LLM export validation failed: website/build/llms.txt not found after website build.\n',
      );
      process.exit(1);
    }
    console.log(
      '🟡 Skipping LLM export validation: website/build/llms.txt not found (site not built).\n',
    );
    process.exit(0);
  }

  console.log('🤖 Validating LLM Markdown export...\n');

  const pages = collectMarkdownPages(BUILD_DIR);
  console.log(`   ${pages.length} exported pages\n`);

  checkIndexLinks();
  checkIndexLinksAbsolute();
  checkNoInternalPlans();
  checkBodyLinks(pages);
  checkPlaceholders(pages);
  checkCodeIndentation();
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
