import * as prettier from 'prettier/standalone';
import prettierBabel from 'prettier/plugins/babel';
import prettierEstree from 'prettier/plugins/estree';
import prettierTypescript from 'prettier/plugins/typescript';
import prettierHtml from 'prettier/plugins/html';
import type * as monaco from 'monaco-editor';

/**
 * Register Monaco Editor formatting providers for various languages
 *
 * Uses Prettier for professional-grade code formatting.
 * Registered once when Monaco is initialized.
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
          const formatted = await prettier.format(text, {
            parser: 'babel',
            plugins: [prettierBabel, prettierEstree],
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
          const formatted = await prettier.format(text, {
            parser: 'typescript',
            plugins: [prettierTypescript, prettierEstree],
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
        const formatted = await prettier.format(text, {
          parser: 'html',
          plugins: [prettierHtml],
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
        const formatted = await prettier.format(text, {
          parser: 'css',
          plugins: [prettierHtml], // CSS parser is in html plugin
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
