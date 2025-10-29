import baseConfig from '@walkeros/config/jest/web.config';

export default {
  ...baseConfig,
  displayName: 'quickstart',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};