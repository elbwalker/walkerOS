import baseConfig from '@walkeros/config/eslint/node';

export default [
  ...baseConfig,
  {
    // Docker is a runtime server application, console logging and process.exit are legitimate
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'off',
      'no-process-exit': 'off',
    },
  },
];
