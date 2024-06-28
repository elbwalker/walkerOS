const commonConfig = require('@elbwalker/jest/web.config');

const config = {
  testEnvironment: 'jsdom',
};

module.exports = { ...commonConfig, ...config };
