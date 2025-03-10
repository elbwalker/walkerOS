import baseConfig from '@elbwalker/jest';

const config = {
  setupFilesAfterEnv: ['@elbwalker/jest/node.setup'],
};

export default { ...baseConfig, ...config };
