/**
 * Vanilla JS syntax highlighter for JavaScript, JSON, HTML, and other languages
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
  .${SYNTAX_CLASSES.tag} { color: #117744; font-weight: bold; }
  .${SYNTAX_CLASSES.attr} { color: #0077aa; }
  .${SYNTAX_CLASSES.value} { color: #669900; }
  .${SYNTAX_CLASSES.lineNumber} { 
    color: #999999; 
    user-select: none; 
    margin-right: 10px; 
    min-width: 20px; 
    display: inline-block; 
    text-align: right; 
  }
`;

/**
 * JavaScript/TypeScript keywords
 */
const JS_KEYWORDS = [
  'abstract',
  'as',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
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
  'of',
  'private',
  'protected',
  'public',
  'return',
  'static',
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
 * HTML tag names (common ones)
 */
const HTML_TAGS = [
  'a',
  'abbr',
  'address',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'label',
  'legend',
  'li',
  'link',
  'main',
  'map',
  'mark',
  'meta',
  'meter',
  'nav',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'param',
  'picture',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'section',
  'select',
  'small',
  'source',
  'span',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'svg',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'u',
  'ul',
  'var',
  'video',
  'wbr',
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
 * Wrap text in a span with a CSS class
 */
function wrapInClass(text: string, className: string): string {
  return `<span class="${className}">${escapeHtml(text)}</span>`;
}

/**
 * Highlight JavaScript/TypeScript code
 */
function highlightJavaScript(code: string): string {
  let result = code;

  // Escape HTML first
  result = escapeHtml(result);

  // Comments (single line)
  result = result.replace(/\/\/.*$/gm, (match) =>
    wrapInClass(
      match
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&'),
      SYNTAX_CLASSES.comment,
    ),
  );

  // Comments (multi line)
  result = result.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    wrapInClass(
      match
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&'),
      SYNTAX_CLASSES.comment,
    ),
  );

  // String literals (double quotes)
  result = result.replace(/&quot;(?:[^&\\]|\\.|&[^;]+;)*&quot;/g, (match) =>
    wrapInClass(match.replace(/&quot;/g, '"'), SYNTAX_CLASSES.string),
  );

  // String literals (single quotes)
  result = result.replace(/&#39;(?:[^&\\]|\\.|&[^;]+;)*&#39;/g, (match) =>
    wrapInClass(match.replace(/&#39;/g, "'"), SYNTAX_CLASSES.string),
  );

  // Template literals
  result = result.replace(/`(?:[^`\\]|\\.)*`/g, (match) =>
    wrapInClass(match, SYNTAX_CLASSES.string),
  );

  // Numbers
  result = result.replace(/\b\d+\.?\d*\b/g, (match) =>
    wrapInClass(match, SYNTAX_CLASSES.number),
  );

  // Keywords
  const keywordPattern = new RegExp(`\\b(${JS_KEYWORDS.join('|')})\\b`, 'g');
  result = result.replace(keywordPattern, (match) =>
    wrapInClass(match, SYNTAX_CLASSES.keyword),
  );

  // Operators
  result = result.replace(/[+\-*/%=<>!&|^~?:]/g, (match) =>
    wrapInClass(match, SYNTAX_CLASSES.operator),
  );

  // Punctuation
  result = result.replace(/[{}[\]();,\.]/g, (match) =>
    wrapInClass(match, SYNTAX_CLASSES.punctuation),
  );

  return result;
}

/**
 * Highlight JSON code
 */
function highlightJSON(code: string): string {
  let result = escapeHtml(code);

  // String values (including property names)
  result = result.replace(/&quot;(?:[^&\\]|\\.|&[^;]+;)*&quot;/g, (match) => {
    const unescaped = match.replace(/&quot;/g, '"');
    return wrapInClass(unescaped, SYNTAX_CLASSES.string);
  });

  // Numbers
  result = result.replace(/:\s*(-?\d+\.?\d*)/g, (match, number) =>
    match.replace(number, wrapInClass(number, SYNTAX_CLASSES.number)),
  );

  // Boolean and null values
  result = result.replace(/:\s*(true|false|null)/g, (match, value) =>
    match.replace(value, wrapInClass(value, SYNTAX_CLASSES.keyword)),
  );

  // Punctuation
  result = result.replace(/[{}[\],:]/g, (match) =>
    wrapInClass(match, SYNTAX_CLASSES.punctuation),
  );

  return result;
}

/**
 * Highlight HTML code
 */
function highlightHTML(code: string): string {
  let result = escapeHtml(code);

  // HTML tags
  result = result.replace(
    /(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)/g,
    (match, bracket, tagName) => {
      if (HTML_TAGS.includes(tagName.toLowerCase())) {
        return bracket + wrapInClass(tagName, SYNTAX_CLASSES.tag);
      }
      return match;
    },
  );

  // Attributes
  result = result.replace(
    /(\s)([a-zA-Z-]+)(=)/g,
    (match, space, attrName, equals) => {
      return space + wrapInClass(attrName, SYNTAX_CLASSES.attr) + equals;
    },
  );

  // Attribute values
  result = result.replace(
    /=(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g,
    (match, value) => {
      const unescaped = value.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      return '=' + wrapInClass(unescaped, SYNTAX_CLASSES.value);
    },
  );

  // Comments
  result = result.replace(/&lt;!--[\s\S]*?--&gt;/g, (match) => {
    const unescaped = match.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    return wrapInClass(unescaped, SYNTAX_CLASSES.comment);
  });

  return result;
}

/**
 * Add line numbers to highlighted code
 */
function addLineNumbers(code: string): string {
  const lines = code.split('\n');
  return lines
    .map((line, index) => {
      const lineNumber = (index + 1).toString().padStart(2, ' ');
      return `<span class="${SYNTAX_CLASSES.lineNumber}">${lineNumber}</span>${line}`;
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
      // Simple CSS highlighting - can be expanded later
      highlighted = escapeHtml(code);
      break;
    default:
      highlighted = escapeHtml(code);
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
