import { Options, defineConfig } from 'tsup';

const config: Options = {
  // clean: true, // Not yet supported for multiple entry points
  entry: ['src/index.ts'],
  minify: 'terser',
  splitting: false,
  terserOptions: {
    mangle: {
      properties: {
        regex: /^[A-Z]/, // Only mangle capitalized properties
        reserved: [
          // Prevent mangle from renaming these properties
        ],
      },
    },
  },
};

export default defineConfig([
  {
    ...config,
    dts: true,
    format: ['cjs', 'esm'],
    sourcemap: true,
  },
]);
