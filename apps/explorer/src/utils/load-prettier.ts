/** The Prettier parsers explorer formats with. */
export type PrettierParser = 'babel' | 'typescript' | 'html' | 'css';

/**
 * Prettier and the plugins one parser needs, loaded on first use. The imports
 * stay dynamic in explorer's build (Prettier is external), so a page that
 * never formats code ships no Prettier, and formatting HTML loads the HTML
 * plugin alone.
 */
export async function loadPrettier(parser: PrettierParser) {
  const [{ format }, ...plugins] = await Promise.all([
    import('prettier/standalone'),
    ...(parser === 'html'
      ? [import('prettier/plugins/html')]
      : parser === 'css'
        ? [import('prettier/plugins/postcss')]
        : parser === 'babel'
          ? [
              import('prettier/plugins/babel'),
              import('prettier/plugins/estree'),
            ]
          : [
              import('prettier/plugins/typescript'),
              import('prettier/plugins/estree'),
            ]),
  ]);
  return { format, plugins };
}
