import baseConfig from '@walkeros/jest/web.config.mjs';

const config = {
  testEnvironment: 'jsdom',
};

export default { ...baseConfig, ...config };