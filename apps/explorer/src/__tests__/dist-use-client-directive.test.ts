import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The built explorer bundle MUST begin with the `"use client"` directive so
 * Next.js treats the package as a client boundary. tsup is configured to keep it
 * (the esbuildOptions banner plus terser `compress.directives: false`, which
 * otherwise strips a leading directive down to `"use strict"`). A future tsup /
 * terser change that drops the banner would silently break every Next.js
 * consumer: a server component importing explorer would fail to build (or render
 * a broken client boundary). This guard locks the directive in.
 *
 * Staleness/absence are handled by the package `turbo.json`, which makes the
 * `test` task depend on `build` (so the guard always runs against fresh dist) and
 * lists `dist/**` as an input; the assertions below additionally FAIL LOUD (never
 * skip) if the build output is missing.
 */
const DIST_DIR = resolve(__dirname, '../../dist');

describe('built dist preserves the "use client" boundary', () => {
  // `index.mjs` is `"use client";...`; `index.js` is `"use client";"use strict";...`.
  for (const entry of ['index.mjs', 'index.js']) {
    it(`${entry} starts with the "use client" directive`, () => {
      const file = resolve(DIST_DIR, entry);
      expect(existsSync(file)).toBe(true);
      const head = readFileSync(file, 'utf8').slice(0, 64);
      expect(head.startsWith('"use client"')).toBe(true);
    });
  }
});
