import baseConfig from '@elbwalker/jest/web.config';

const config = {
    testEnvironment: 'jsdom',
  };

export default { ...baseConfig, ...config };
