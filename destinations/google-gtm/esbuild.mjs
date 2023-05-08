import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  platform: 'node',
  outfile: 'dist/index.js',
});

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  platform: 'neutral',
  outfile: 'dist/index.mjs',
});

await esbuild.build({
  entryPoints: ['src/es5.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'destination',
  platform: 'browser',
  outfile: 'dist/es5.js',
});
