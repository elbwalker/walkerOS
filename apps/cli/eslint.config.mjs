import baseConfig from '@walkeros/config/eslint';
import { nodePlatform } from '@walkeros/config/eslint/node';

export default [...baseConfig, ...nodePlatform];
