import * as prettier from 'prettier/standalone';
import prettierBabel from 'prettier/plugins/babel';
import prettierEstree from 'prettier/plugins/estree';
import prettierTypescript from 'prettier/plugins/typescript';
import prettierHtml from 'prettier/plugins/html';

/**
 * Format code using Prettier
 *
 * @param code - The code to format
 * @param language - The language (javascript, typescript, json, html, css)
 * @returns Formatted code, or original code if formatting fails
 */
export async function formatCode(
  code: string,
  language: string,
): Promise<string> {
  try {
    let formatted: string;

    switch (language) {
      case 'javascript':
      case 'js': {
        // Wrap bare objects in parens so Prettier can parse them
        // Skip one-liners — they're intentionally compact
        const isBareObject =
          code.trimStart().startsWith('{') && code.includes('\n');
        const input = isBareObject ? `(${code})` : code;
        formatted = await prettier.format(input, {
          parser: 'babel',
          plugins: [prettierBabel, prettierEstree],
          semi: true,
          singleQuote: true,
          trailingComma: 'all',
        });
        if (isBareObject) {
          // Unwrap: remove leading "(" and trailing ");\n"
          formatted = formatted.replace(/^\(/, '').replace(/\);?\s*$/, '');
        }
        break;
      }

      case 'typescript':
      case 'ts':
      case 'tsx':
        formatted = await prettier.format(code, {
          parser: 'typescript',
          plugins: [prettierTypescript, prettierEstree],
          semi: true,
          singleQuote: true,
          trailingComma: 'all',
        });
        break;

      case 'json':
        // Use native JSON for simplicity
        const parsed = JSON.parse(code);
        formatted = JSON.stringify(parsed, null, 2);
        break;

      case 'html':
        formatted = await prettier.format(code, {
          parser: 'html',
          plugins: [prettierHtml],
          htmlWhitespaceSensitivity: 'css',
        });
        break;

      case 'css':
      case 'scss':
        formatted = await prettier.format(code, {
          parser: 'css',
          plugins: [prettierHtml],
        });
        break;

      default:
        // Unsupported language, return original
        return code;
    }

    // Trim trailing whitespace/newlines
    return formatted.trim();
  } catch (error) {
    return code;
  }
}
