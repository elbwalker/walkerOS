import baseConfig from '@walkeros/config/jest/node.config';

const config = {
  testTimeout: 30000,
  transformIgnorePatterns: ['/node_modules/(?!(@walkeros|chalk)/)'],
  testPathIgnorePatterns: [
    ...(baseConfig.testPathIgnorePatterns || []),
    '\\.tmp',
  ],
};

export default { ...baseConfig, ...config };