import baseConfig from '@walkerOS/jest';

const config = {
  setupFilesAfterEnv: ['@walkerOS/jest/node.setup'],
};

export default { ...baseConfig, ...config };
