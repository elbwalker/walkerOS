import nodeConfig from '@walkeros/config/jest/node.config';

export default {
  ...nodeConfig,
  displayName: '@walkeros/docker',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/index.ts',
  ],
  // Integration tests need more time for server startup
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Integration tests spawn real Node processes - open handles are expected
  // Base config has forceExit: true, but also detectOpenHandles: true (warns)
  // Override to silence warnings for spawned child processes
  detectOpenHandles: false,
};
