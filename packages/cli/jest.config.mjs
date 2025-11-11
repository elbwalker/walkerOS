import baseConfig from '@walkeros/config/jest/node.config';

const config = {
  testTimeout: 30000,
  transformIgnorePatterns: ['/node_modules/(?!(@walkeros|chalk)/)'],
};

export default { ...baseConfig, ...config };