const baseConfig = require('@walkerOS/eslint/package.json');

module.exports = {
  extends: '@walkerOS/eslint',
  rules: {
    // Disable explicit any rule for migrated legacy code
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
