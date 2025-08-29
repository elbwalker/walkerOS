import webConfig from '@walkeros/jest/web.config.mjs';

export default {
  ...webConfig,
  displayName: 'react-demo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};