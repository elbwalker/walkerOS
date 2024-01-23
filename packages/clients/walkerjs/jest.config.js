const commonConfig = require('@elbwalker/jest');

const config = {
  testEnvironment: 'jsdom',
};

module.exports = { ...commonConfig, ...config };
