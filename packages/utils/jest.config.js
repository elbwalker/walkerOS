const commonConfig = require('@elbwalker/jest');

const config = {
  testEnvironment: 'jsdom', // @TODO edit for node utils
};

module.exports = { ...commonConfig, ...config };
