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

function checkOverviewCoverage(
  pages: string[],
  area: 'sources' | 'destinations',
): void {
  const overview = join(DOCS, area, 'index.mdx');
  if (!existsSync(overview)) {
    issues.push({ message: `website/docs/${area}/index.mdx is missing` });
    return;
  }
  const content = readFileSync(overview, 'utf-8');

  for (const page of pages) {
    const id = docId(page);
    if (!id.startsWith(`${area}/`)) continue;
    if (id === `${area}/index`) continue;
    if (id in OVERVIEW_EXEMPT) continue;

    // Overview pages list packages, not their detail pages. A package is
    // <area>/<platform>/<name>, written either as <name>.mdx or <name>/index.mdx.
    // Anything deeper (browser/commands, browser/tagging/javascript) documents a
    // package that is already listed, so it does not belong in the table.
    const depth = id.replace(/\/index$/, '').split('/').length;
    if (depth !== 3) continue;

    // Overview pages link either absolutely (/docs/destinations/server/x) or
    // relatively (./server/x, ./web/browser/). Accept both, and accept an
    // index page referenced by its directory.
    const tail = id.slice(area.length + 1);
    const withoutIndex = tail.replace(/\/index$/, '');
    const candidates = [
      `/docs/${id}`,
      `/docs/${area}/${withoutIndex}`,
      `./${tail}`,
      `./${withoutIndex}`,
      `./${withoutIndex}/`,
    ];
    if (candidates.some((c) => content.includes(c))) continue;

    issues.push({
      message: `${relative(ROOT, page)}\n    in the sidebar but missing from website/docs/${area}/index.mdx, so it is invisible to anyone browsing the overview. Add a row, or add it to OVERVIEW_EXEMPT with a reason.`,
    });
  }
}

function main(): void {
  console.log('🧭 Validating docs coverage...\n');

  const pages = walk(DOCS);
  checkSidebarCoverage(pages);
  checkOverviewCoverage(pages, 'sources');
  checkOverviewCoverage(pages, 'destinations');

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
