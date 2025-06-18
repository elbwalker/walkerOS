import baseConfig from '@walkerOS/jest';

const config = {
  setupFilesAfterEnv: ['@walkerOS/jest/web.setup'],
  testEnvironment: 'jsdom',
};

export default { ...baseConfig, ...config };
