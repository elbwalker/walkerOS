#!/usr/bin/env npx tsx
/**
 * Drift gate for docs reachability. A page can build cleanly, pass every link
 * check and still be unreachable, because the sidebar is hand-written and the
 * overview tables are hand-written markdown. Nothing else catches that.
 *
 * Two assertions:
 *   1. Every docs page appears in website/sidebars.ts.
 *   2. Every source and destination page appears in its overview page, which is
 *      what a reader browses and what an LLM scrapes as the catalogue.
 *
 * Usage: npx tsx apps/scripts/validate-docs-coverage.ts
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface Issue {
  message: string;
}

const ROOT = process.cwd();
const DOCS = join(ROOT, 'website', 'docs');
const SIDEBARS = join(ROOT, 'website', 'sidebars.ts');
const issues: Issue[] = [];

/**
 * Pages deliberately absent from the sidebar. Each entry states why, so an
 * exemption that outlives its reason is visible rather than silent.
 */
const SIDEBAR_EXEMPT: Record<string, string> = {};

/**
 * Packages deliberately absent from the overview tables.
 */
const OVERVIEW_EXEMPT: Record<string, string> = {
  'destinations/code': 'a configuration mechanism, not a vendor destination',
  'destinations/create-your-own': 'authoring guide, not a destination',
  'destinations/web/gtag/index': 'family overview, its members are listed',
  'sources/create-your-own': 'authoring guide, not a source',
  'transformers/create-your-own': 'authoring guide, not a transformer',
};

/** Areas whose index page is the catalogue a reader browses. */
const AREAS = ['sources', 'destinations', 'transformers'] as const;
type Area = (typeof AREAS)[number];

/**
 * Segment count of a package page's doc id, area segment included. Sources and
 * destinations split by platform (destinations/server/klaviyo); transformers
 * do not (transformers/bot).
 */
const PACKAGE_DEPTH: Record<Area, number> = {
  sources: 3,
  destinations: 3,
  transformers: 2,
};

/**
 * Directories that ship one package per child, rather than documenting a single
 * package across sub-pages. Depth alone cannot tell those apart:
 * sources/web/browser/commands is a sub-page of the browser source, while
 * destinations/web/gtag/ads is a destination in its own right. Without this
 * map, a new gtag or CMP member could ship linked from nowhere.
 *
 * Each entry names the page that must link the family's members. gtag members
 * are listed individually in the destinations catalogue, so they are enforced
 * against it. The CMP family is linked from the sources catalogue as a whole,
 * so its members are enforced against the family index instead, which is the
 * page a reader actually lands on to choose one.
 */
const FAMILY_DIRS: Record<string, string> = {
  'destinations/web/gtag': 'destinations/index',
  'sources/web/cmps': 'sources/web/cmps/index',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) {
      walk(abs, out);
    } else if (/\.mdx?$/.test(entry)) {
      out.push(abs);
    }
  }
  return out;
}

/** Docusaurus doc id: path under website/docs without its extension. */
function docId(abs: string): string {
  return relative(DOCS, abs)
    .replace(/\\/g, '/')
    .replace(/\.mdx?$/, '');
}

function checkSidebarCoverage(pages: string[]): void {
  const sidebar = readFileSync(SIDEBARS, 'utf-8');

  for (const page of pages) {
    const id = docId(page);
    if (id in SIDEBAR_EXEMPT) continue;

    // A category linked via `link: { type: 'doc', id: 'x/index' }` covers
    // x/index; a bare 'x/index' entry covers it too. Both spell out the id.
    if (sidebar.includes(`'${id}'`) || sidebar.includes(`"${id}"`)) continue;

    // An index page is also reachable when its directory is a category link.
    const asCategory = id.replace(/\/index$/, '');
    if (
      id.endsWith('/index') &&
      (sidebar.includes(`'${asCategory}'`) ||
        sidebar.includes(`"${asCategory}"`))
    )
      continue;

    issues.push({
      message: `${relative(ROOT, page)}\n    not reachable from website/sidebars.ts (doc id "${id}"). Add it, or add it to SIDEBAR_EXEMPT with a reason.`,
    });
  }
}

/**
 * Doc id of the page that must link this doc, or undefined when the doc is not
 * a package page: an area or family index, a sub-page of a package already
 * listed, or a stated exemption.
 */
function overviewOwner(id: string, area: Area): string | undefined {
  if (id === `${area}/index`) return undefined;
  if (id in OVERVIEW_EXEMPT) return undefined;

  const withoutIndex = id.replace(/\/index$/, '');
  const segments = withoutIndex.split('/');
  const family = FAMILY_DIRS[segments.slice(0, -1).join('/')];
  if (family) return family;

  return segments.length === PACKAGE_DEPTH[area] ? `${area}/index` : undefined;
}

function checkOverviewCoverage(pages: string[], area: Area): void {
  const overview = join(DOCS, area, 'index.mdx');
  if (!existsSync(overview)) {
    issues.push({ message: `website/docs/${area}/index.mdx is missing` });
    return;
  }
  const contents = new Map<string, string>();

  for (const page of pages) {
    const id = docId(page);
    if (!id.startsWith(`${area}/`)) continue;

    const owner = overviewOwner(id, area);
    if (!owner) continue;

    const ownerRel = `website/docs/${owner}.mdx`;
    const ownerAbs = join(DOCS, `${owner}.mdx`);
    if (!existsSync(ownerAbs)) {
      issues.push({
        message: `${ownerRel} is missing, but ${relative(ROOT, page)} has to be listed there`,
      });
      continue;
    }
    let content = contents.get(ownerAbs);
    if (content === undefined) {
      content = readFileSync(ownerAbs, 'utf-8');
      contents.set(ownerAbs, content);
    }

    // Overview pages link either absolutely (/docs/destinations/server/x) or
    // relatively to their own directory (./server/x, ./cookiefirst/). Accept
    // both, and accept an index page referenced by its directory.
    const ownerDir = owner.replace(/\/[^/]+$/, '');
    const withoutIndex = id.replace(/\/index$/, '');
    const tail = id.slice(ownerDir.length + 1);
    const tailWithoutIndex = withoutIndex.slice(ownerDir.length + 1);
    const candidates = [
      `/docs/${id}`,
      `/docs/${withoutIndex}`,
      `./${tail}`,
      `./${tailWithoutIndex}`,
      `./${tailWithoutIndex}/`,
    ];
    if (candidates.some((c) => content.includes(c))) continue;

    issues.push({
      message: `${relative(ROOT, page)}\n    in the sidebar but missing from ${ownerRel}, so it is invisible to anyone browsing the overview. Add a row, or add it to OVERVIEW_EXEMPT with a reason.`,
    });
  }
}

function main(): void {
  console.log('🧭 Validating docs coverage...\n');

  const pages = walk(DOCS);
  checkSidebarCoverage(pages);
  for (const area of AREAS) checkOverviewCoverage(pages, area);

  if (issues.length === 0) {
    console.log(`✅ All ${pages.length} docs pages are reachable!\n`);
    process.exit(0);
  }

  console.log(`❌ Found ${issues.length} docs coverage issues:\n`);
  for (const issue of issues) {
    console.log(`  ${issue.message}\n`);
  }
  process.exit(1);
}

main();
