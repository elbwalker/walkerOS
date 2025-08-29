import baseConfig from '@walkeros/jest/index.mjs';

const config = {
  setupFilesAfterEnv: ['@walkeros/jest/web.setup'],
  testEnvironment: 'jsdom',
};

export default { ...baseConfig, ...config };
