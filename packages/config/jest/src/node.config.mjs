import baseConfig from '@walkerOS/jest/index.mjs';

const config = {
  setupFilesAfterEnv: ['@walkerOS/jest/node.setup'],
};

export default { ...baseConfig, ...config };
