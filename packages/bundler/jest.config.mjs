import baseConfig from '@walkeros/jest';

export default {
  ...baseConfig,
  displayName: '@walkeros/bundler',
  testTimeout: 30000,
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'html', 'json'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ['/node_modules/(?!(chalk|@walkeros)/)'],
};
