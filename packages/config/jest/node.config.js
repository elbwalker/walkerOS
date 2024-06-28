const commonConfig = require('./');

const config = {
  setupFilesAfterEnv: ['@elbwalker/jest/node.setup.ts'],
  testEnvironment: 'jsdom',
};

module.exports = { ...commonConfig, ...config };
