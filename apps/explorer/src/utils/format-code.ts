import { loadPrettier } from './load-prettier';

// Prettier and its parser plugins load on the first call, and only those the
// requested language needs (load-prettier): a page that never formats code
// ships none of them, and formatting HTML loads the HTML plugin alone.

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
        const { format, plugins } = await loadPrettier('babel');
        // Wrap bare objects in parens so Prettier can parse them
        // Skip one-liners — they're intentionally compact
        const isBareObject =
          code.trimStart().startsWith('{') && code.includes('\n');
        const input = isBareObject ? `(${code})` : code;
        formatted = await format(input, {
          parser: 'babel',
          plugins,
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
      case 'tsx': {
        const { format, plugins } = await loadPrettier('typescript');
        formatted = await format(code, {
          parser: 'typescript',
          plugins,
          semi: true,
          singleQuote: true,
          trailingComma: 'all',
        });
        break;
      }

      case 'json':
        // Use native JSON for simplicity
        const parsed = JSON.parse(code);
        formatted = JSON.stringify(parsed, null, 2);
        break;

      case 'html': {
        const { format, plugins } = await loadPrettier('html');
        formatted = await format(code, {
          parser: 'html',
          plugins,
          htmlWhitespaceSensitivity: 'css',
        });
        break;
      }

      case 'css':
      case 'scss': {
        const { format, plugins } = await loadPrettier('css');
        formatted = await format(code, {
          parser: 'css',
          plugins,
        });
        break;
      }

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
