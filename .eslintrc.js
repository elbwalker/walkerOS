module.exports = {
  "root": true,
  "env": {
    "es6": true,
    "browser": true,
    "node": true,
    "jest": true
  },
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "jest"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    // "plugin:jest/recommended",
    "prettier",
    "prettier/@typescript-eslint",
    "plugin:compat/recommended"
  ],
  "parserOptions": {
    "project": "tsconfig.json",
    "tsconfigRootDir": __dirname,
    "ecmaVersion": 2018,
    "sourceType": "module"
  },
  "rules": {
    "no-console": "warn",
    "jest/no-disabled-tests": "warn",
    "jest/no-focused-tests": "error",
  }
}
