import baseConfig from '@walkeros/config/jest/web.config';

const config = {
  displayName: 'quickstart',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default { ...baseConfig, ...config };
