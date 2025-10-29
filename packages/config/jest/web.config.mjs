import baseConfig from '@walkeros/config/jest';

const config = {
  setupFilesAfterEnv: ['@walkeros/config/jest/web.setup'],
  testEnvironment: 'jsdom',
};

export default { ...baseConfig, ...config };
