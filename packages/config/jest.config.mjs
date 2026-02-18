import baseConfig from '@walkeros/config/jest';

export default {
  ...baseConfig,
  displayName: 'config',
  testMatch: ['<rootDir>/tsup/__tests__/**/*.test.(ts|tsx|js|jsx|mjs)'],
};
