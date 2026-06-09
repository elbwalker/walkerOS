import baseConfig from '@walkeros/config/eslint';

export default [
  ...baseConfig,
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
      ],
    },
  },
];
