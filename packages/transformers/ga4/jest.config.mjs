import baseConfig from '@walkeros/config/jest/node.config';

const config = {
  passWithNoTests: true,
};

export default { ...baseConfig, ...config };
