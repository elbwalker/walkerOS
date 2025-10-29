import baseConfig from '@walkeros/config/jest';

const config = {
  setupFilesAfterEnv: ['@walkeros/config/jest/node.setup'],
};

export default { ...baseConfig, ...config };
