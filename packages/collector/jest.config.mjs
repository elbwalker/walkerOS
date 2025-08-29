import baseConfig from '@walkeros/jest/web.config.mjs';

export default {
  ...baseConfig,
  displayName: '@walkeros/collector',
  testEnvironment: 'jsdom',
};