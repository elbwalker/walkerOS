module.exports = {
  extends: ['@walkeros/eslint'],
  env: {
    browser: true,
    es2023: true,
  },
  overrides: [
    {
      files: ['**/*.stories.*'],
      rules: {
        'import/no-anonymous-default-export': 'off',
      },
    },
  ],
};
