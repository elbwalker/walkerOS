#!/usr/bin/env npx tsx
/**
 * Validates internal links in documentation files
 * Usage: npx tsx apps/scripts/validate-links.ts
 */

import { readFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import { resolve, dirname, relative } from 'path';

interface LinkError {
  file: string;
  line: number;
  link: string;
  reason: string;
}

const ROOT = process.cwd();
const errors: LinkError[] = [];

// Patterns to check
const PATTERNS = [
  'packages/**/README.md',
  'website/docs/**/*.mdx',
  'skills/**/*.md',
];

// Skip these directories (contain templates/examples, not real docs)
const SKIP_PATTERNS = [
  'docs/**/*.md', // Internal planning docs with example links
  '**/dist/**', // Built output
];

// Links that are clearly examples/templates (not real paths)
const EXAMPLE_LINK_PATTERNS = [
  /^link$/, // Just "link"
  /^\.\/src\/types/, // Template examples
  /skill-name/, // Template placeholder
  /path\/to\//, // Example path
  /\.\.\/skill\//, // Template skill reference
  /\.\.\./, // Ellipsis in path (template placeholder like /docs/...)
  /\[[^\]]+\]/, // Square-bracket placeholder (template like /docs/[path])
];

// walkerOS docs links are absolute (READMEs publish to npm where relative
// links break) but still resolve to local website/docs source files.
const WALKEROS_DOCS_RE = /^https:\/\/(?:www\.)?walkeros\.io\/docs\//;

// Extract markdown links from content
function extractLinks(content: string): Array<{ link: string; line: number }> {
  const links: Array<{ link: string; line: number }> = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Match [text](link) but not external URLs
    const regex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      const link = match[2];
      const isExternal =
        link.startsWith('http://') || link.startsWith('https://');
      const isWalkerosDocs = WALKEROS_DOCS_RE.test(link);
      // Validate internal links and walkerOS docs links; skip other external
      // URLs, anchors, mailto, and example/template patterns.
      if (
        (!isExternal || isWalkerosDocs) &&
        !link.startsWith('#') &&
        !link.startsWith('mailto:') &&
        !EXAMPLE_LINK_PATTERNS.some((pattern) => pattern.test(link))
      ) {
        links.push({ link, line: index + 1 });
      }
    }
  });

  return links;
}

// Validate a single link
function validateLink(
  file: string,
  link: string,
  line: number,
): LinkError | null {
  // Remove anchor
  let [path] = link.split('#');
  if (!path) return null; // Anchor only

  // Map absolute walkerOS docs URLs to their root-relative docs path, then
  // strip any trailing slash so directory pages resolve via /index.mdx below.
  if (WALKEROS_DOCS_RE.test(path)) {
    path = path.replace(/^https:\/\/(?:www\.)?walkeros\.io/, '');
  }
  path = path.replace(/\/$/, '') || path;

  let resolvedPath: string;

  // Handle Docusaurus root-relative links (/docs and /docs/...)
  if (path === '/docs' || path.startsWith('/docs/')) {
    // /docs/sources/ -> website/docs/sources/
    resolvedPath = resolve(ROOT, 'website', path.slice(1));
  } else if (path.startsWith('/')) {
    // Other root-relative paths (like /diagrams/)
    resolvedPath = resolve(ROOT, 'website/static', path.slice(1));
  } else {
    // Relative paths - resolve from file's directory
    const fileDir = dirname(file);
    resolvedPath = resolve(ROOT, fileDir, path);
  }

  // Check if file/directory exists
  if (!existsSync(resolvedPath)) {
    // Try with common extensions
    const extensions = [
      '.md',
      '.mdx',
      '.ts',
      '.tsx',
      '/index.mdx',
      '/index.md',
      '.png',
      '.jpg',
      '.svg',
    ];
    const found = extensions.some((ext) => existsSync(resolvedPath + ext));

    if (!found) {
      return {
        file: relative(ROOT, file),
        line,
        link,
        reason: `Target not found: ${relative(ROOT, resolvedPath)}`,
      };
    }
  }

  return null;
}

async function main() {
  console.log('🔗 Validating internal links...\n');

  const files = await glob(PATTERNS, {
    cwd: ROOT,
    ignore: ['**/node_modules/**', ...SKIP_PATTERNS],
    absolute: true,
  });

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const links = extractLinks(content);

    for (const { link, line } of links) {
      const error = validateLink(file, link, line);
      if (error) {
        errors.push(error);
      }
    }
  }

  if (errors.length === 0) {
    console.log('✅ All internal links are valid!\n');
    process.exit(0);
  }

  console.log(`❌ Found ${errors.length} broken links:\n`);
  for (const error of errors) {
    console.log(`  ${error.file}:${error.line}`);
    console.log(`    Link: ${error.link}`);
    console.log(`    ${error.reason}\n`);
  }

  process.exit(1);
}

main().catch(console.error);
