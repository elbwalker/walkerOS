/**
 * Simple, robust syntax highlighter without overlapping issues
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
 * Tokenize and highlight code to avoid overlapping
 */
interface Token {
  type: 'keyword' | 'string' | 'number' | 'comment' | 'text';
  value: string;
  start: number;
  end: number;
}

function tokenizeJavaScript(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const keywords = [
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

  while (i < code.length) {
    const start = i;

    // Skip whitespace
    if (/\s/.test(code[i])) {
      while (i < code.length && /\s/.test(code[i])) i++;
      tokens.push({ type: 'text', value: code.slice(start, i), start, end: i });
      continue;
    }

    // Comments
    if (code.slice(i, i + 2) === '//') {
      while (i < code.length && code[i] !== '\n') i++;
      tokens.push({
        type: 'comment',
        value: code.slice(start, i),
        start,
        end: i,
      });
      continue;
    }

    if (code.slice(i, i + 2) === '/*') {
      i += 2;
      while (i < code.length - 1 && code.slice(i, i + 2) !== '*/') i++;
      if (i < code.length - 1) i += 2;
      tokens.push({
        type: 'comment',
        value: code.slice(start, i),
        start,
        end: i,
      });
      continue;
    }

    // Strings
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const quote = code[i];
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\') i++; // Skip escaped characters
        i++;
      }
      i++; // Include closing quote
      tokens.push({
        type: 'string',
        value: code.slice(start, i),
        start,
        end: i,
      });
      continue;
    }

    // Numbers
    if (/\d/.test(code[i])) {
      while (i < code.length && /[\d.]/.test(code[i])) i++;
      tokens.push({
        type: 'number',
        value: code.slice(start, i),
        start,
        end: i,
      });
      continue;
    }

    // Keywords and identifiers
    if (/[a-zA-Z_$]/.test(code[i])) {
      while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) i++;
      const value = code.slice(start, i);
      const type = keywords.includes(value) ? 'keyword' : 'text';
      tokens.push({ type, value, start, end: i });
      continue;
    }

    // Everything else
    i++;
    tokens.push({ type: 'text', value: code.slice(start, i), start, end: i });
  }

  return tokens;
}

function highlightTokens(tokens: Token[]): string {
  return tokens
    .map((token) => {
      const escaped = escapeHtml(token.value);
      switch (token.type) {
        case 'keyword':
          return `<span class="${SYNTAX_CLASSES.keyword}">${escaped}</span>`;
        case 'string':
          return `<span class="${SYNTAX_CLASSES.string}">${escaped}</span>`;
        case 'number':
          return `<span class="${SYNTAX_CLASSES.number}">${escaped}</span>`;
        case 'comment':
          return `<span class="${SYNTAX_CLASSES.comment}">${escaped}</span>`;
        default:
          return escaped;
      }
    })
    .join('');
}

/**
 * Simple JSON highlighting
 */
function highlightJSON(code: string): string {
  let result = escapeHtml(code);

  // Highlight strings (keys and values)
  result = result.replace(/"[^"]*"/g, (match) => {
    return `<span class="${SYNTAX_CLASSES.string}">${match}</span>`;
  });

  // Highlight numbers
  result = result.replace(/\b-?\d+\.?\d*([eE][+-]?\d+)?\b/g, (match) => {
    return `<span class="${SYNTAX_CLASSES.number}">${match}</span>`;
  });

  // Highlight keywords
  result = result.replace(/\b(true|false|null)\b/g, (match) => {
    return `<span class="${SYNTAX_CLASSES.keyword}">${match}</span>`;
  });

  return result;
}

/**
 * Simple HTML highlighting
 */
function highlightHTML(code: string): string {
  let result = escapeHtml(code);

  // Highlight comments
  result = result.replace(/&lt;!--[\s\S]*?--&gt;/g, (match) => {
    return `<span class="${SYNTAX_CLASSES.comment}">${match}</span>`;
  });

  // Highlight tags
  result = result.replace(
    /&lt;(\/?[\w-]+)([^&gt;]*?)&gt;/g,
    (match, tagName, attributes) => {
      let highlighted =
        '&lt;' + `<span class="${SYNTAX_CLASSES.tag}">${tagName}</span>`;

      if (attributes) {
        // Simple attribute highlighting
        highlighted += attributes.replace(
          /([\w-]+)=(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g,
          (attrMatch: string, attrName: string, attrValue: string) => {
            return `<span class="${SYNTAX_CLASSES.attr}">${attrName}</span>=<span class="${SYNTAX_CLASSES.value}">${attrValue}</span>`;
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
      const lineNumber = `<span class="${SYNTAX_CLASSES.lineNumber}">${(index + 1).toString().padStart(2, ' ')}</span>`;
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
      const tokens = tokenizeJavaScript(code);
      highlighted = highlightTokens(tokens);
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
