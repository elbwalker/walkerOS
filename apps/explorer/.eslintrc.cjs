module.exports = {
  extends: ['@walkeros/eslint/react.cjs'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
