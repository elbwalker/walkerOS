import { readFileSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

// Reads the built files: `npm run test:integration` runs after the build of
// this package and of core.
const root = join(__dirname, '../../../../..');
const walkerjs = readFileSync(join(root, 'apps/walkerjs/dist/walker.js'));
const builds: [string, string][] = [
  ['dist/walker.js', walkerjs.toString('utf8')],
  ...['index.mjs', 'index.js'].map((name): [string, string] => [
    `core dist/${name}`,
    readFileSync(join(root, 'packages/core/dist', name), 'utf8'),
  ]),
];

// The Tag Mode loader budget: dist/walker.js measured before the loader
// (2026-10-09, gzip level 9) plus at most 700 bytes for the loader.
// In effect this caps walker.js's total size, with ~168 B headroom after the
// loader: a PR that grows walker.js for another reason raises
// BEFORE_LOADER_GZIP_BYTES by its measured delta and says so.
const BEFORE_LOADER_GZIP_BYTES = 34_627;
const LOADER_BUDGET_BYTES = 700;

it('keeps the Tag Mode loader within its budget', () => {
  expect(gzipSync(walkerjs, { level: 9 }).length).toBeLessThanOrEqual(
    BEFORE_LOADER_GZIP_BYTES + LOADER_BUDGET_BYTES,
  );
});

// A loader target as the minifier emits it: an object literal with `app` and
// `base` in either order. Scoped to that shape, so another URL elsewhere in a
// build cannot trip the check.
const TARGET =
  /["']?(app|base)["']?\s*:\s*(["'`])([^"'`]*)\2\s*,\s*["']?(app|base)["']?\s*:\s*(["'`])([^"'`]*)\5/g;

function targets(code: string): { app: string; base: string }[] {
  const found: { app: string; base: string }[] = [];
  TARGET.lastIndex = 0;
  let match = TARGET.exec(code);
  while (match) {
    const [, firstKey, , first, secondKey, , second] = match;
    if (firstKey !== secondKey)
      found.push(
        firstKey === 'app'
          ? { app: first, base: second }
          : { app: second, base: first },
      );
    match = TARGET.exec(code);
  }
  return found;
}

it.each(builds)('%s carries the production target only', (_name, code) => {
  const found = targets(code);
  expect(found).toEqual([
    {
      app: 'https://app.walkeros.io',
      base: 'https://cdn.walkeros.io/tag-mode/',
    },
  ]);
  for (const { app, base } of found)
    for (const value of [app, base])
      for (const marker of ['localhost', 'stage.', 'http://'])
        expect(value).not.toContain(marker);
  expect(code).not.toMatch(/stage\.(app|cdn)\.walkeros\.io/);
});

it('dist/walker.js names no localhost anywhere', () => {
  expect(walkerjs.toString('utf8')).not.toMatch(/localhost/);
});
