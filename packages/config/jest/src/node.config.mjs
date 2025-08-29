import baseConfig from '@walkeros/jest/index.mjs';

const config = {
  setupFilesAfterEnv: ['@walkeros/jest/node.setup'],
};

export default { ...baseConfig, ...config };
