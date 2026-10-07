import baseConfig from '@walkeros/config/eslint';

// The base config's own no-restricted-syntax selectors. A flat config replaces
// a rule set twice for one file rather than merging it, so the block below
// repeats them.
const baseSyntax = baseConfig.flatMap((block) => {
  const rule = block.rules?.['no-restricted-syntax'];
  return Array.isArray(rule) ? rule.slice(1) : [];
});

// The runner names app paths in src/api-paths.ts only, next to the operations
// the CLI's client-operations.json lists for it.
const apiPathMessage =
  'Build app URLs in src/api-paths.ts, which names the operation.';
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

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/api-paths.ts', 'src/**/__tests__/**', 'src/**/*.test.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...baseSyntax, ...apiPathSyntax],
    },
  },
];
