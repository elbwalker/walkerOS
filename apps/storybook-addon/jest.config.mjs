import baseConfig from '@walkeros/config/jest/web.config';

const config = {
  testEnvironment: 'jsdom',
  displayName: '@walkeros/storybook-addon',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};

export default { ...baseConfig, ...config };