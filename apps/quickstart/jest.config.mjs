import baseConfig from '@walkerOS/jest/web.config.mjs';

export default {
  ...baseConfig,
  displayName: 'quickstart',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};