import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { forEachMatch } from '../names';
import { isRecord } from '../tokens';

/**
 * The constants entry (@walkeros/explorer/design) is imported by server code
 * (an email builder) and by an esbuild-bundled page stub: it must import
 * nothing, carry no "use client" banner and stay out of the root entry, and
 * every declared design export must point at a file the build produced.
 * Runs against dist: explorer's turbo test task depends on its build.
 */
const packageDir = resolve(__dirname, '../../..');
const read = (path: string): string =>
  readFileSync(resolve(packageDir, path), 'utf8');

function packageJson(): Record<string, unknown> {
  const json: unknown = JSON.parse(read('package.json'));
  return isRecord(json) ? json : {};
}

/** The targets of every `./design*` key in the package exports. */
function designExports(): unknown[] {
  const exportsMap = packageJson().exports;
  if (!isRecord(exportsMap)) return [];
  return Object.entries(exportsMap)
    .filter(([key]) => key.startsWith('./design'))
    .map(([, target]) => target);
}

function designTargets(): string[] {
  return designExports().flatMap((target) =>
    typeof target === 'string'
      ? [target]
      : isRecord(target)
        ? Object.values(target).filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
  );
}

function designRequireTargets(): unknown[] {
  return designExports().flatMap((target) =>
    isRecord(target) && target.require !== undefined ? [target.require] : [],
  );
}

it('the constants entry imports nothing', () => {
  expect(read('src/design/index.ts')).not.toMatch(
    /^\s*(?:import\b|export\s+(?:\*|\{[^}]*\})\s+from\b)|\brequire\(/m,
  );
});

it('the root entry does not re-export the design entry', () => {
  expect(read('src/index.ts')).not.toMatch(/['"]\.\/design['"/]/);
});

it('declares the design subpaths, each pointing at a built file', () => {
  const targets = designTargets();
  expect(targets).toEqual(
    expect.arrayContaining([
      './dist/design/index.d.ts',
      './dist/design/index.mjs',
      './dist/design/index.cjs',
      './dist/design/tokens.css',
      './dist/design/base.css',
      './dist/design/tailwind.css',
    ]),
  );
  expect(
    targets.filter((target) => !existsSync(resolve(packageDir, target))),
  ).toEqual([]);
});

it('every design require target is a .cjs file (explorer is "type": "module")', () => {
  const targets = designRequireTargets();
  expect(targets.length).toBeGreaterThan(0);
  expect(
    targets.filter(
      (target) => typeof target !== 'string' || !target.endsWith('.cjs'),
    ),
  ).toEqual([]);
});

it.each(['dist/design/index.mjs', 'dist/design/index.cjs'])(
  '%s carries no "use client" and no import',
  (file) => {
    const code = read(file);
    expect(code).not.toMatch(/["']use client["']/);
    expect(code).not.toMatch(/\bimport\s|\brequire\(/);
  },
);

it('ships walkeros-design-check as an executable Node script', () => {
  const bin = packageJson().bin;
  expect(isRecord(bin) ? bin['walkeros-design-check'] : undefined).toBe(
    './dist/design/check.mjs',
  );
  expect(read('dist/design/check.mjs').startsWith('#!/usr/bin/env node')).toBe(
    true,
  );
  expect(
    statSync(resolve(packageDir, 'dist/design/check.mjs')).mode & 0o111,
  ).not.toBe(0);
});

it('walkeros-design-check imports only node: built-ins', () => {
  const specifiers: string[] = [];
  forEachMatch(
    /(?:\bfrom|\bimport|\brequire)\s*\(?\s*["']([^"']+)["']/g,
    read('dist/design/check.mjs'),
    (match) => specifiers.push(match[1]),
  );
  expect(specifiers.length).toBeGreaterThan(0);
  expect(
    specifiers.filter((specifier) => !specifier.startsWith('node:')),
  ).toEqual([]);
});
