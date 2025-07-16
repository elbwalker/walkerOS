import baseConfig from '@walkerOS/jest/web.config.mjs';

export default {
  ...baseConfig,
  displayName: '@walkerOS/collector',
  testEnvironment: 'jsdom',
};