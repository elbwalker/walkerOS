import baseConfig from '@walkeros/config/jest';

const config = {
  setupFilesAfterEnv: ['@walkeros/config/jest/web.setup'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'https://example.com',
  },
};

export default { ...baseConfig, ...config };
