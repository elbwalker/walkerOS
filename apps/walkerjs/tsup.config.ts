import { readFileSync } from 'node:fs';
import type { BuildFlag } from '@walkeros/core';
import { defineConfig, buildBrowser } from '@walkeros/config/tsup';

function readVersion(): string {
  const pkg: unknown = JSON.parse(readFileSync('./package.json', 'utf8'));
  if (typeof pkg === 'object' && pkg !== null && 'version' in pkg) {
    const { version } = pkg;
    if (typeof version === 'string') return version;
  }
  throw new Error('apps/walkerjs/package.json has no version');
}

const version = readVersion();

// Build flags (see @walkeros/core build-flags): the fixed file needs no
// Observe, no declared stores and no step validation, so they fold out.
// State stays on: a page can add a destination with state via
// `walker destination`.
const buildFlags: Record<Exclude<BuildFlag, '__WALKEROS_STATE__'>, string> = {
  __WALKEROS_OBSERVE__: 'false',
  __WALKEROS_STORES__: 'false',
  __WALKEROS_VALIDATE__: 'false',
};

export default defineConfig([
  buildBrowser({
    entry: { walker: 'src/index.ts' },
    format: 'iife',
    target: 'es2018',
    outExtension: () => ({ js: '.js' }),
    define: buildFlags,
    banner: {
      js: `/*! walker.js v${version} | MIT | walkeros.io/docs/apps/walkerjs | build your own: app.walkeros.io */`,
    },
  }),
]);
