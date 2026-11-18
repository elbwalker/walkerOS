import baseConfig from '@walkeros/config/jest/node.config';
import runnerConfig from './jest.config.mjs';

// The runner's process suite: `runneros remote` as real processes, run from
// the built dist/. It runs only by `npm run test:processes` after a build,
// never in the default test run, in a turbo task or in CI: before a
// prerelease that changes remote mode, and when working on remote mode.
export default {
  ...runnerConfig,
  testMatch: ['<rootDir>/src/__tests__/processes/**/*.test.ts'],
  testPathIgnorePatterns: baseConfig.testPathIgnorePatterns,
  testTimeout: 120000,
};
