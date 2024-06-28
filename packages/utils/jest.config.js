const commonConfig = require('@elbwalker/jest/web.config');

const config = {
  testEnvironment: 'jsdom', // @TODO edit for node utils
};

module.exports = { ...commonConfig, ...config };
