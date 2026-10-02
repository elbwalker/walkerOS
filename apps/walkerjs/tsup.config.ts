import { readFileSync } from 'node:fs';
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

export default defineConfig([
  buildBrowser({
    entry: { walker: 'src/index.ts' },
    format: 'iife',
    target: 'es2018',
    outExtension: () => ({ js: '.js' }),
    banner: {
      js: `/*! walker.js v${version} | MIT | walkeros.io/docs/apps/walkerjs | build your own: app.walkeros.io */`,
    },
  }),
]);
