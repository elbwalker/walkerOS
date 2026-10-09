import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

// Every internal link on the landing, in the navbar and in the footer comes
// from landing/links.ts. This resolves each one to a real page or doc, so a
// dead link fails here, not only in CI's build. Run with tsx.
const WEBSITE = new URL('..', import.meta.url).pathname;
const ROOT = join(WEBSITE, '..');
const DOCS = join(WEBSITE, 'docs');
const { ROUTES, SECTION_ID } = await import(
  `${WEBSITE}src/components/landing/links.ts`
);

/** Docs whose front matter sets an absolute slug, by that slug. */
function docSlugs() {
  const slugs = new Map();
  for (const file of readdirSync(DOCS, { recursive: true })) {
    if (!/\.mdx?$/.test(file)) continue;
    const front = /^---\n([\s\S]*?)\n---/.exec(
      readFileSync(join(DOCS, file), 'utf8'),
    );
    const slug = front && /^slug:\s*['"]?(\/[^'"\n]*)['"]?\s*$/m.exec(front[1]);
    if (slug) slugs.set(slug[1].replace(/\/$/, '') || '/', file);
  }
  return slugs;
}

const SLUGS = docSlugs();
const MOVED = new Set(SLUGS.values());
const SKILLS = new Set(
  JSON.parse(readFileSync(join(ROOT, 'skills/INDEX.json'), 'utf8')).skills.map(
    (skill) => skill.name,
  ),
);

/** The doc file a docs path renders, relative to docs/, or undefined. */
function docFile(path) {
  const slug = SLUGS.get(`/${path}`.replace(/\/$/, '') || '/');
  if (slug) return slug;
  const base = join(DOCS, path);
  return [
    `${base}.md`,
    `${base}.mdx`,
    join(base, 'index.md'),
    join(base, 'index.mdx'),
  ]
    .map((file) => relative(DOCS, file))
    .find((file) => existsSync(join(DOCS, file)) && !MOVED.has(file));
}

/**
 * A doc's heading anchors as Docusaurus writes them: an explicit `{#id}`,
 * else the github-slugger slug of the heading text (lower case, punctuation
 * dropped, spaces to hyphens), with `-1`, `-2` on repeats.
 */
function docAnchors(file) {
  const text = readFileSync(join(DOCS, file), 'utf8').replace(
    /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm,
    '',
  );
  const anchors = new Set();
  const seen = new Map();
  for (const [, heading] of text.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) {
    const explicit = /\{#([^}]+)\}$/.exec(heading);
    if (explicit) {
      anchors.add(explicit[1]);
      continue;
    }
    const slug = heading
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}_ -]/gu, '')
      .replace(/ /g, '-');
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    anchors.add(count === 0 ? slug : `${slug}-${count}`);
  }
  return anchors;
}

/** True when `route` reaches a page, a doc, a skill, a doc heading or a landing section. */
function resolves(route) {
  const [path, hash] = route.split('#');
  const docPath =
    (path === '/docs' || path.startsWith('/docs/')) &&
    path.replace(/^\/docs\/?/, '').replace(/\/$/, '');
  if (hash !== undefined) {
    if (path === '/') return Object.values(SECTION_ID).includes(hash);
    const file = docPath !== false && docFile(docPath);
    return Boolean(file) && docAnchors(file).has(hash);
  }
  if (docPath !== false) return docFile(docPath) !== undefined;
  if (path === '/skills' || path.startsWith('/skills/')) {
    const name = path.replace(/^\/skills\/?/, '').replace(/\/$/, '');
    return name === '' || SKILLS.has(name);
  }
  const page = join(WEBSITE, 'src/pages', path.replace(/\/$/, ''));
  return [`${page}.tsx`, join(page, 'index.tsx')].some((file) =>
    existsSync(file),
  );
}

test('the resolver accepts pages, docs, slugs, skills, doc headings and sections and rejects the rest', () => {
  assert.equal(resolves('/docs/'), true, 'the docs root is a slug');
  assert.equal(resolves('/playground/'), true);
  assert.equal(resolves('/skills/'), true);
  assert.equal(resolves('/#plans'), true);
  assert.equal(
    resolves('/docs/getting-started'),
    false,
    'a file moved by its slug',
  );
  assert.equal(
    resolves('/docs/sources/web/browser/tagging'),
    false,
    'a client-redirect source',
  );
  assert.equal(resolves('/#nowhere'), false);
  assert.equal(resolves('/docs/apps/mcp#quick-start'), true, 'a doc heading');
  assert.equal(resolves('/docs/apps/mcp#nowhere'), false);
});

test('every internal landing, navbar and footer route resolves', () => {
  for (const [name, route] of Object.entries(ROUTES))
    assert.ok(resolves(route), `ROUTES.${name} (${route}) does not resolve`);
});

// A font file that is missing falls back silently to the system font.
test('every font url in custom.css exists under static/', () => {
  const css = readFileSync(join(WEBSITE, 'src/css/custom.css'), 'utf8');
  const urls = [
    ...css.matchAll(/url\(\s*['"]?(\/fonts\/[^'")\s]+)['"]?\s*\)/g),
  ].map((match) => match[1]);
  assert.ok(urls.length >= 2, 'custom.css loads Geist and Geist Mono');
  for (const url of urls)
    assert.ok(
      existsSync(join(WEBSITE, 'static', url)),
      `${url} is missing under static/`,
    );
});

test('the navbar and footer take every link from links.ts', () => {
  const config = readFileSync(join(WEBSITE, 'docusaurus.config.ts'), 'utf8');
  const chrome = config.slice(
    config.indexOf('navbar: {'),
    config.indexOf('mermaid: {'),
  );
  assert.match(chrome, /to: ROUTES\.playground/);
  // A `to` item on '/#plans' is a router NavLink that matches every path.
  assert.match(chrome, /href: ROUTES\.services, label: 'Services'/);
  assert.doesNotMatch(chrome, /to: ROUTES\.services/);
  assert.doesNotMatch(chrome, /\b(to|href): ['`]/, 'a link written by hand');
});
