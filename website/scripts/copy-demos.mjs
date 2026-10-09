#!/usr/bin/env node
// Build step after `docusaurus build`: copies the demo pages of
// apps/demos/storybook (built by Vite with relative asset URLs) into
// <target>/demos/, next to the Docusaurus Demos page at demos/index.html,
// which frames them.
//
// Usage: node scripts/copy-demos.mjs [target] [source]
//   target  default website/build
//   source  default apps/demos/storybook/dist
//
// A missing demo build fails the website build: the Demos page never ships
// without the pages it frames.

import { cpSync, existsSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBSITE_DIR = join(__dirname, '..');
const DEMO_PAGES = ['shop', 'media'];

const target = resolve(process.argv[2] ?? join(WEBSITE_DIR, 'build'));
const source = resolve(
  process.argv[3] ??
    join(WEBSITE_DIR, '..', 'apps', 'demos', 'storybook', 'dist'),
);

function fail(message) {
  console.error(`copy-demos: ${message}`);
  process.exit(1);
}

const missing = DEMO_PAGES.filter(
  (page) => !existsSync(join(source, page, 'index.html')),
);
if (missing.length > 0)
  fail(
    `no demo build for ${missing.join(', ')} in ${source}. ` +
      'Build it first: npx turbo run build --filter=@walkeros/storybook-demo',
  );

// Everything the build emitted: the pages, their assets and the favicon.
const entries = readdirSync(source);
// demos/index.html is the Docusaurus Demos page; the demo build never
// replaces it.
if (entries.includes('index.html'))
  fail(`${join(source, 'index.html')} would replace the Demos page`);

const outDir = join(target, 'demos');
for (const entry of entries)
  cpSync(join(source, entry), join(outDir, entry), { recursive: true });

console.log(`copy-demos: ${entries.join(', ')} -> ${outDir}`);
