import baseConfig from '@walkeros/config/eslint';

const message =
  'Files, processes and cli loaders or runners belong to src/runtime. Accept a FlowRuntime instead.';

// The base config's own no-restricted-syntax selectors. A flat config replaces
// a rule set twice for one file rather than merging it, so every block below
// that sets the rule repeats them.
const baseSyntax = baseConfig.flatMap((block) => {
  const rule = block.rules?.['no-restricted-syntax'];
  return Array.isArray(rule) ? rule.slice(1) : [];
});

// App operations go through the CLI's typed client (`apiRequest`), so the
// compiler checks each against the contract.
const apiPathMessage =
  "Call the app through apiRequest('<METHOD> <path>') from @walkeros/cli, not a string path.";
const openapiFetchArgument =
  'CallExpression[callee.type="MemberExpression"][callee.property.name=/^(GET|POST|PUT|PATCH|DELETE)$/] > Literal.arguments:first-child';
const apiPathSyntax = [
  {
    selector: `Literal[value=/^\\/api\\//]:not(${openapiFetchArgument}):not(TSLiteralType > Literal):not(TSPropertySignature > Literal.key)`,
    message: apiPathMessage,
  },
  {
    selector: 'TemplateLiteral > TemplateElement[value.raw=/^\\/api\\//]',
    message: apiPathMessage,
  },
];

// The CLI's raw fetch helpers stay public API, but the MCP calls the app
// through apiRequest.
const rawFetchHelpers = {
  group: ['@walkeros/cli'],
  importNames: ['apiFetch', 'publicFetch', 'deployFetch'],
  message: "Call the app through apiRequest from '@walkeros/cli' instead.",
};

const tests = ['src/**/__tests__/**', 'src/**/*.test.ts'];
const devZones = ['src/dev.ts', 'src/examples/**', 'src/schemas/**'];

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    ignores: [...tests, ...devZones],
    rules: {
      'no-restricted-syntax': ['error', ...baseSyntax, ...apiPathSyntax],
    },
  },
  {
    // The base config turns its own selectors off in the dev zones; the
    // string-path ban still holds there.
    files: devZones,
    ignores: tests,
    rules: { 'no-restricted-syntax': ['error', ...apiPathSyntax] },
  },
  {
    files: ['src/**/*.ts'],
    ignores: tests,
    rules: {
      'no-restricted-imports': ['error', { patterns: [rawFetchHelpers] }],
    },
  },
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
            rawFetchHelpers,
          ],
        },
      ],
    },
  },
];
