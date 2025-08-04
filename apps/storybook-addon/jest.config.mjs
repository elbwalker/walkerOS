import baseConfig from '@walkeros/jest/web.config.mjs';

const config = {
  testEnvironment: 'jsdom',
  displayName: '@walkeros/storybook-addon',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};

export default { ...baseConfig, ...config };