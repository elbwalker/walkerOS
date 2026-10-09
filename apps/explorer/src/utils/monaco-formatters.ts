import type * as monaco from 'monaco-editor';
import { loadPrettier } from './load-prettier';

/**
 * Register Monaco Editor formatting providers for various languages
 *
 * Uses Prettier for professional-grade code formatting.
 * Registered once when Monaco is initialized; Prettier and the language's
 * plugins load on the first format of that language (load-prettier).
 *
 * Supported languages:
 * - JavaScript (parser: babel)
 * - TypeScript (parser: typescript)
 * - JSON (native JSON.stringify)
 * - HTML (parser: html)
 * - CSS (parser: css)
 */
export function registerFormatters(monacoInstance: typeof monaco): void {
  // JavaScript formatter
  monacoInstance.languages.registerDocumentFormattingEditProvider(
    'javascript',
    {
      async provideDocumentFormattingEdits(model, options) {
        try {
          const text = model.getValue();
          const { format, plugins } = await loadPrettier('babel');
          const formatted = await format(text, {
            parser: 'babel',
            plugins,
            tabWidth: options.tabSize,
            useTabs: !options.insertSpaces,
            semi: true,
            singleQuote: true,
            trailingComma: 'all',
          });
          return [
            {
              range: model.getFullModelRange(),
              text: formatted,
            },
          ];
        } catch (error) {
          return [];
        }
      },
    },
  );

  // TypeScript formatter
  monacoInstance.languages.registerDocumentFormattingEditProvider(
    'typescript',
    {
      async provideDocumentFormattingEdits(model, options) {
        try {
          const text = model.getValue();
          const { format, plugins } = await loadPrettier('typescript');
          const formatted = await format(text, {
            parser: 'typescript',
            plugins,
            tabWidth: options.tabSize,
            useTabs: !options.insertSpaces,
            semi: true,
            singleQuote: true,
            trailingComma: 'all',
          });
          return [
            {
              range: model.getFullModelRange(),
              text: formatted,
            },
          ];
        } catch (error) {
          return [];
        }
      },
    },
  );

  // JSON formatter (use native JSON.stringify for simplicity)
  monacoInstance.languages.registerDocumentFormattingEditProvider('json', {
    async provideDocumentFormattingEdits(model, options) {
      try {
        const text = model.getValue();
        const parsed = JSON.parse(text);
        const formatted = JSON.stringify(parsed, null, options.tabSize);
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      } catch (error) {
        return [];
      }
    },
  });

  // HTML formatter
  monacoInstance.languages.registerDocumentFormattingEditProvider('html', {
    async provideDocumentFormattingEdits(model, options) {
      try {
        const text = model.getValue();
        const { format, plugins } = await loadPrettier('html');
        const formatted = await format(text, {
          parser: 'html',
          plugins,
          tabWidth: options.tabSize,
          useTabs: !options.insertSpaces,
          htmlWhitespaceSensitivity: 'css',
        });
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      } catch (error) {
        return [];
      }
    },
  });

  // CSS formatter
  monacoInstance.languages.registerDocumentFormattingEditProvider('css', {
    async provideDocumentFormattingEdits(model, options) {
      try {
        const text = model.getValue();
        const { format, plugins } = await loadPrettier('css');
        const formatted = await format(text, {
          parser: 'css',
          plugins,
          tabWidth: options.tabSize,
          useTabs: !options.insertSpaces,
        });
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      } catch (error) {
        return [];
      }
    },
  });
}
