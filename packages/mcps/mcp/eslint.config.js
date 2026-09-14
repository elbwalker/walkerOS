import baseConfig from '@walkeros/config/eslint';

const message =
  'Files, processes and cli loaders or runners belong to src/runtime. Accept a FlowRuntime instead.';

export default [
  ...baseConfig,
  {
    // Capability fence: only the runtimes and the local stdio door reach the
    // machine directly, so a hosted runtime can withhold that access.
    files: ['src/**/*.ts'],
    ignores: [
      'src/runtime/**',
      'src/stdio.ts',
      'src/index.ts',
      'src/**/__tests__/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@walkeros/cli',
              importNames: [
                'loadJsonConfig',
                'loadJsonFromSource',
                'loadConfig',
                'bundle',
                'push',
                'simulateSource',
                'simulateTransformer',
                'simulateCollector',
                'simulateDestination',
              ],
              message,
            },
            ...[
              'fs',
              'node:fs',
              'fs/promises',
              'node:fs/promises',
              'child_process',
              'node:child_process',
              'module',
              'node:module',
            ].map((name) => ({ name, message })),
          ],
          patterns: [
            { regex: '(^|/)runtime/(local|bundle-cache)(\\.js)?$', message },
          ],
        },
      ],
    },
  },
];
