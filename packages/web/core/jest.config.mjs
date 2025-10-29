import baseConfig from '@walkeros/config/jest/web.config';

const config = {
  testEnvironment: 'jsdom',
};

export default { ...baseConfig, ...config };