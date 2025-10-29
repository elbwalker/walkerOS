import baseConfig from '@walkeros/config/jest/web.config';

export default {
  ...baseConfig,
  displayName: '@walkeros/collector',
  testEnvironment: 'jsdom',
};