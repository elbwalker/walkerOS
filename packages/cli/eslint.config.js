import baseConfig from '@walkeros/config/eslint';
import { nodePlatform } from '@walkeros/config/eslint/node';

// The base config's own no-restricted-syntax selectors. A flat config replaces
// a rule set twice for one file rather than merging it, so every block below
// that sets the rule repeats them.
const baseSyntax = baseConfig.flatMap((block) => {
  const rule = block.rules?.['no-restricted-syntax'];
  return Array.isArray(rule) ? rule.slice(1) : [];
});

// The CLI calls a fixed set of app operations, named in one file, so the app
// can keep each one in its public API set.
const apiPathMessage =
  'The CLI names app paths only in src/core/app-paths.ts (its fixed operations); walkeros api takes its path from the person.';
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
  ...nodePlatform,
  {
    files: ['src/**/*.ts'],
    ignores: [...tests, ...devZones, 'src/core/app-paths.ts'],
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
    // Guard the bundle codegen against regressing the lazy /dev registry.
    // The skeleton must register a package's ./dev surface as a lazy thunk
    // (`() => import('<pkg>/dev')`) so the deploy wrap can DCE it. A static
    // `import * as ... from '<pkg>/dev'` cannot be tree-shaken and leaks the
    // dev graph (zod schemas) into production bundles. A non-literal dynamic
    // import specifier would also defeat static analysis and esbuild's DCE.
    files: ['src/commands/bundle/bundler.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...baseSyntax,
        {
          selector:
            'ImportDeclaration[source.value=/\\/dev$/]:has(ImportNamespaceSpecifier)',
          message:
            "Do not statically `import * as` from a '<pkg>/dev' subpath in the bundle codegen: it cannot be tree-shaken out of the deploy wrap. Emit a lazy `() => import('<pkg>/dev')` registry entry instead.",
        },
        {
          selector: 'ImportExpression > .source:not(Literal)',
          message:
            'Dynamic import() in the bundle codegen must use a literal specifier so esbuild can statically analyse and DCE it.',
        },
        ...apiPathSyntax,
      ],
    },
  },
];
