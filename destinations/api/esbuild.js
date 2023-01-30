const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['src/index.ts'],
    outfile: 'dist/index.js',
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['node18'],
  })
  .catch(console.log);

esbuild
  .build({
    entryPoints: ['src/index.ts'],
    outfile: 'dist/browser.js',
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['es6'],
  })
  .catch(console.log);
