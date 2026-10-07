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

function resolvesDoc(path) {
  if (SLUGS.has(`/${path}`.replace(/\/$/, '') || '/')) return true;
  const base = join(DOCS, path);
  return [
    `${base}.md`,
    `${base}.mdx`,
    join(base, 'index.md'),
    join(base, 'index.mdx'),
  ].some((file) => existsSync(file) && !MOVED.has(relative(DOCS, file)));
}

/** True when `route` reaches a page, a doc, a skill or a landing section. */
function resolves(route) {
  const [path, hash] = route.split('#');
  if (hash !== undefined)
    return path === '/' && Object.values(SECTION_ID).includes(hash);
  if (path === '/docs' || path.startsWith('/docs/'))
    return resolvesDoc(path.replace(/^\/docs\/?/, '').replace(/\/$/, ''));
  if (path === '/skills' || path.startsWith('/skills/')) {
    const name = path.replace(/^\/skills\/?/, '').replace(/\/$/, '');
    return name === '' || SKILLS.has(name);
  }
  const page = join(WEBSITE, 'src/pages', path.replace(/\/$/, ''));
  return [`${page}.tsx`, join(page, 'index.tsx')].some((file) =>
    existsSync(file),
  );
}

test('the resolver accepts pages, docs, slugs, skills and sections and rejects the rest', () => {
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
