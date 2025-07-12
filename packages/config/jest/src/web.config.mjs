import baseConfig from '@walkerOS/jest/index.mjs';

const config = {
  setupFilesAfterEnv: ['@walkerOS/jest/web.setup'],
  testEnvironment: 'jsdom',
};

export default { ...baseConfig, ...config };
