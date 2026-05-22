import baseConfig from '@walkeros/config/jest/node.config';

const config = {
  // 3 workers: CLI bundling suites spawn esbuild's own thread pool, so 4+ oversubscribes.
  // forceExit removed: no current suite leaves the live stdin pipe open (stdin tests mock/restore
  // process.stdin; the only live-pipe consumer is the e2e suite, which runs in a child process and
  // is excluded from the default `test` script). If the PIPEWRAP hang ever returns, fix it at the
  // source (process.stdin.destroy()/unref() in src/core/stdin.ts, or inject the stream) rather than
  // forceExit, and keep --detectOpenHandles in CI as a guard.
  maxWorkers: 3,
  testTimeout: 30000,
  // Transform ESM packages: jsdom 27+ and its dependencies are pure ESM,
  // p-limit 4+ is also pure-ESM and pulls in yocto-queue.
  transformIgnorePatterns: [
    'node_modules/(?!(@walkeros|chalk|jsdom|parse5|nwsapi|entities|msw|until-async|@bundled-es-modules|@mswjs|@open-draft|p-limit|yocto-queue)/)',
  ],
  testPathIgnorePatterns: [
    ...(baseConfig.testPathIgnorePatterns || []),
    '\\.tmp',
  ],
  // CLI-specific: Fix Jest + pacote + spdx-* CJS/JSON resolution
  // pacote (used for npm package downloads) has a deep CJS dependency chain that
  // requires spdx-license-ids and spdx-exceptions JSON modules, which Jest cannot resolve by default
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // ESM: Map .js imports to .ts files for Jest (TypeScript source files use .js extensions for Node.js ESM)
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^spdx-license-ids$':
      '<rootDir>/../../node_modules/spdx-license-ids/index.json',
    '^spdx-license-ids/deprecated$':
      '<rootDir>/../../node_modules/spdx-license-ids/deprecated.json',
    '^spdx-exceptions$':
      '<rootDir>/../../node_modules/spdx-exceptions/index.json',
  },
};

export default { ...baseConfig, ...config };