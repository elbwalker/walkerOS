import { defineConfig } from '@walkeros/tsup';

export default defineConfig([
  // Build main module
  {
    entry: { index: 'src/index.ts' },
    clean: true,
    format: ['cjs', 'esm'],
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.js' };
    },
    dts: true,
    sourcemap: true,
    external: ['react', 'react-dom'],
    esbuildOptions(options) {
      options.banner = { js: '"use client"' }; // Next.js client component compat
    },
  },

  // Build CSS separately
  {
    entry: { styles: 'src/styles/index.css' },
    outDir: 'dist',
    clean: false, // Don't clean between builds
  },
]);
