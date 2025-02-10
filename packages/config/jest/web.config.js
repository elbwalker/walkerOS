import baseConfig from '@elbwalker/jest';

const config = {
  setupFilesAfterEnv: ['@elbwalker/jest/web.setup'],
  testEnvironment: 'jsdom',
};

export default { ...baseConfig, ...config };
