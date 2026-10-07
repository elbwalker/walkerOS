import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { forEachMatch } from '../../names';

/**
 * The design components entry (@walkeros/explorer/design/components) is what a
 * Claude Design "Built" sync bundles: it must reach nothing but react, so the
 * sync never pulls in Monaco, rjsf, shiki or the collector. It stays out of the
 * root entry, which keeps its own atom Button (one import path per value).
 * The dist checks run against the build: explorer's turbo test task depends on it.
 */
const packageDir = resolve(__dirname, '../../../..');
const designDir = resolve(packageDir, 'src/design');
const ALLOWED = ['react', 'react/jsx-runtime'];

// Imports, re-exports, side-effect imports, dynamic import() and require().
const SPECIFIER =
  /(?:\bfrom|^\s*import|\bimport\s*\(|\brequire\s*\()\s*['"]([^'"]+)['"]/gm;

const read = (path: string): string =>
  readFileSync(resolve(packageDir, path), 'utf8');

function specifiers(code: string): string[] {
  const found: string[] = [];
  forEachMatch(SPECIFIER, code, (match) => found.push(match[1]));
  return found;
}

function resolveRelative(from: string, specifier: string): string {
  const base = resolve(dirname(from), specifier);
  const file = [
    `${base}.ts`,
    `${base}.tsx`,
    base,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  if (!file) throw new Error(`${specifier} from ${from} does not resolve`);
  return file;
}

/** Every file the entry reaches through relative imports, and every package. */
function reachable(): { files: string[]; packages: string[] } {
  const files = new Set<string>();
  const packages = new Set<string>();
  const visit = (file: string): void => {
    if (files.has(file)) return;
    files.add(file);
    for (const specifier of specifiers(readFileSync(file, 'utf8'))) {
      if (specifier.startsWith('.')) visit(resolveRelative(file, specifier));
      else packages.add(specifier);
    }
  };
  visit(resolve(designDir, 'components/index.ts'));
  return { files: [...files], packages: [...packages] };
}

it('the entry reaches no package but react', () => {
  const { packages } = reachable();
  expect(packages).toContain('react');
  expect(packages.filter((name) => !ALLOWED.includes(name))).toEqual([]);
});

it('the entry reaches no file outside src/design', () => {
  const { files } = reachable();
  expect(files.length).toBeGreaterThan(1);
  expect(
    files
      .map((file) => relative(designDir, file))
      .filter((path) => path.startsWith('..')),
  ).toEqual([]);
});

it('the root entry does not re-export the design components entry', () => {
  expect(read('src/index.ts')).not.toMatch(/design\/components/);
});

it.each([
  'dist/design/components/index.mjs',
  'dist/design/components/index.cjs',
])('%s starts with "use client" and loads only react', (file) => {
  const code = read(file);
  expect(code.startsWith('"use client"')).toBe(true);
  expect(specifiers(code).filter((name) => !ALLOWED.includes(name))).toEqual(
    [],
  );
});
