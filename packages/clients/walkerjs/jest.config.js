const commonConfig = require('@elbwalker/jest');

const config = {
  setupFilesAfterEnv: ['<rootDir>/__tests__/jest.setup.ts'],
  testEnvironment: 'jsdom',
};

module.exports = { ...commonConfig, ...config };
