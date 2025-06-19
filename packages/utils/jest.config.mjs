import baseConfig from '@walkerOS/jest/web.config.mjs';

const config = {
  testEnvironment: 'jsdom',
};

export default { ...baseConfig, ...config };
