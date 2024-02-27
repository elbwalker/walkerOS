const commonConfig = require('./');

const config = {
  setupFilesAfterEnv: ['@elbwalker/jest/web.setup.ts'],
  testEnvironment: 'jsdom',
};

module.exports = { ...commonConfig, ...config };
