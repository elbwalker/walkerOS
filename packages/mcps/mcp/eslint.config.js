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

// The local server calls no app: it names no app route.
const apiPathMessage =
  '@walkeros/mcp names no app route: cloud tools live in the hosted walkerOS MCP server.';
const apiPathSyntax = [
  {
    selector:
      'Literal[value=/^\\/api\\//]:not(TSLiteralType > Literal):not(TSPropertySignature > Literal.key)',
    message: apiPathMessage,
  },
  {
    selector: 'TemplateLiteral > TemplateElement[value.raw=/^\\/api\\//]',
    message: apiPathMessage,
  },
];

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
    // Capability fence: only the runtimes and the local stdio door reach the
    // machine directly, so a runtime with `load` only can withhold that access.
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
