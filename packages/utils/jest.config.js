import baseConfig from '@walkerOS/jest/web.config';

const config = {
  testEnvironment: 'jsdom',
};

export default { ...baseConfig, ...config };
