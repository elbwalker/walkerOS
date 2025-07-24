/**
 * Fixed vanilla JS syntax highlighter
 */

export type SupportedLanguage =
  | 'javascript'
  | 'json'
  | 'html'
  | 'css'
  | 'typescript';

export interface HighlightOptions {
  language: SupportedLanguage;
  showLineNumbers?: boolean;
  tabSize?: number;
}

export interface HighlightResult {
  highlighted: string;
  lineCount: number;
}

/**
 * CSS classes for syntax highlighting
 */
export const SYNTAX_CLASSES = {
  keyword: 'syntax-keyword',
  string: 'syntax-string',
  number: 'syntax-number',
  comment: 'syntax-comment',
  operator: 'syntax-operator',
  punctuation: 'syntax-punctuation',
  property: 'syntax-property',
  tag: 'syntax-tag',
  attr: 'syntax-attr',
  value: 'syntax-value',
  lineNumber: 'syntax-line-number',
} as const;

/**
 * Default CSS styles for syntax highlighting
 */
export const DEFAULT_SYNTAX_CSS = `
  .${SYNTAX_CLASSES.keyword} { color: #0077aa; font-weight: bold; }
  .${SYNTAX_CLASSES.string} { color: #669900; }
  .${SYNTAX_CLASSES.number} { color: #990055; }
  .${SYNTAX_CLASSES.comment} { color: #999999; font-style: italic; }
  .${SYNTAX_CLASSES.operator} { color: #9a6e3a; }
  .${SYNTAX_CLASSES.punctuation} { color: #999999; }
  .${SYNTAX_CLASSES.property} { color: #0077aa; }
  .${SYNTAX_CLASSES.tag} { color: #22863a; font-weight: bold; }
  .${SYNTAX_CLASSES.attr} { color: #6f42c1; }
  .${SYNTAX_CLASSES.value} { color: #032f62; }
  .${SYNTAX_CLASSES.lineNumber} { 
    color: #999999; 
    margin-right: 12px; 
    user-select: none;
    display: inline-block;
    width: 40px;
    text-align: right;
  }
`;

/**
 * JavaScript/TypeScript keywords
 */
const JS_KEYWORDS = [
  'abstract',
  'any',
  'as',
  'async',
  'await',
  'boolean',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'constructor',
  'continue',
  'debugger',
  'declare',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'number',
  'of',
  'private',
  'protected',
  'public',
  'readonly',
  'return',
  'static',
  'string',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'with',
  'yield',
];

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Simple wrapper function - no double escaping
 */
function wrapInClass(text: string, className: string): string {
  return `<span class="${className}">${text}</span>`;
}

/**
 * Simplified JavaScript highlighting
 */
function highlightJavaScript(code: string): string {
  // Start with escaped HTML
  let result = escapeHtml(code);

  // Highlight strings first (to avoid keyword conflicts within strings)
  result = result.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, (match) => {
    return wrapInClass(match, SYNTAX_CLASSES.string);
  });

  // Highlight template literals
  result = result.replace(/`((?:\\.|[^`\\])*?)`/g, (match) => {
    return wrapInClass(match, SYNTAX_CLASSES.string);
  });

  // Highlight single line comments
  result = result.replace(/\/\/.*$/gm, (match) => {
    return wrapInClass(match, SYNTAX_CLASSES.comment);
  });

  // Highlight multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    return wrapInClass(match, SYNTAX_CLASSES.comment);
  });

  // Highlight numbers
  result = result.replace(/\b\d+\.?\d*\b/g, (match) => {
    return wrapInClass(match, SYNTAX_CLASSES.number);
  });

  // Highlight keywords (avoid already highlighted content)
  const keywordRegex = new RegExp(`\\b(${JS_KEYWORDS.join('|')})\\b`, 'g');
  result = result.replace(keywordRegex, (match) => {
    // Skip if already inside a span
    return wrapInClass(match, SYNTAX_CLASSES.keyword);
  });

  return result;
}

/**
 * Simplified JSON highlighting
 */
function highlightJSON(code: string): string {
  let result = escapeHtml(code);

  // Highlight strings
  result = result.replace(/"((?:\\.|[^"\\])*?)"/g, (match) => {
    return wrapInClass(match, SYNTAX_CLASSES.string);
  });

  // Highlight numbers
  result = result.replace(/\b-?\d+\.?\d*([eE][+-]?\d+)?\b/g, (match) => {
    return wrapInClass(match, SYNTAX_CLASSES.number);
  });

  // Highlight keywords
  result = result.replace(/\b(true|false|null)\b/g, (match) => {
    return wrapInClass(match, SYNTAX_CLASSES.keyword);
  });

  return result;
}

/**
 * Simplified HTML highlighting
 */
function highlightHTML(code: string): string {
  let result = escapeHtml(code);

  // Highlight comments
  result = result.replace(/&lt;!--[\s\S]*?--&gt;/g, (match) => {
    return wrapInClass(match, SYNTAX_CLASSES.comment);
  });

  // Highlight tags
  result = result.replace(
    /&lt;(\/?[\w-]+)([^&gt;]*?)&gt;/g,
    (match, tagName, attributes) => {
      let highlighted = '&lt;' + wrapInClass(tagName, SYNTAX_CLASSES.tag);

      if (attributes) {
        // Highlight attributes
        highlighted += attributes.replace(
          /([\w-]+)=(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g,
          (attrMatch: string, attrName: string, attrValue: string) => {
            return (
              wrapInClass(attrName, SYNTAX_CLASSES.attr) +
              '=' +
              wrapInClass(attrValue, SYNTAX_CLASSES.value)
            );
          },
        );
      }

      highlighted += '&gt;';
      return highlighted;
    },
  );

  return result;
}

/**
 * Add line numbers to code
 */
function addLineNumbers(code: string): string {
  const lines = code.split('\n');
  return lines
    .map((line, index) => {
      const lineNumber = wrapInClass(
        (index + 1).toString().padStart(2, ' '),
        SYNTAX_CLASSES.lineNumber,
      );
      return lineNumber + line;
    })
    .join('\n');
}

/**
 * Main syntax highlighting function
 */
export function highlightSyntax(
  code: string,
  options: HighlightOptions,
): HighlightResult {
  if (!code || code.trim() === '') {
    return { highlighted: '', lineCount: 0 };
  }

  let highlighted: string;

  switch (options.language) {
    case 'javascript':
    case 'typescript':
      highlighted = highlightJavaScript(code);
      break;
    case 'json':
      highlighted = highlightJSON(code);
      break;
    case 'html':
      highlighted = highlightHTML(code);
      break;
    case 'css':
    default:
      highlighted = escapeHtml(code);
      break;
  }

  if (options.showLineNumbers) {
    highlighted = addLineNumbers(highlighted);
  }

  const lineCount = code.split('\n').length;

  return {
    highlighted,
    lineCount,
  };
}
