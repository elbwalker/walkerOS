/**
 * Syntax Highlighting - Lightweight syntax highlighting without external dependencies
 *
 * Features:
 * - JavaScript, HTML, CSS, JSON syntax highlighting
 * - Regex-based parsing for performance
 * - Customizable themes
 * - No external dependencies
 */

export interface SyntaxToken {
  type: string;
  value: string;
  start: number;
  end: number;
}

export type SupportedLanguage =
  | 'javascript'
  | 'html'
  | 'css'
  | 'json'
  | 'typescript'
  | 'text';

/**
 * Language definitions with regex patterns
 */
const languageDefinitions: Record<
  SupportedLanguage,
  Array<{ type: string; pattern: RegExp; className: string }>
> = {
  javascript: [
    {
      type: 'comment',
      pattern: /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
      className: 'syntax-comment',
    },
    {
      type: 'string',
      pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,
      className: 'syntax-string',
    },
    {
      type: 'keyword',
      pattern:
        /\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/g,
      className: 'syntax-keyword',
    },
    {
      type: 'boolean',
      pattern: /\b(?:true|false|null|undefined)\b/g,
      className: 'syntax-keyword',
    },
    {
      type: 'number',
      pattern: /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g,
      className: 'syntax-number',
    },
    {
      type: 'function',
      pattern: /\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()/g,
      className: 'syntax-function',
    },
    {
      type: 'operator',
      pattern:
        /[+\-*/%=!<>?:&|^~]+|===|!==|==|!=|<=|>=|\|\||&&|\+\+|--|=>|\.\.\./g,
      className: 'syntax-operator',
    },
  ],

  typescript: [
    {
      type: 'comment',
      pattern: /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
      className: 'syntax-comment',
    },
    {
      type: 'string',
      pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,
      className: 'syntax-string',
    },
    {
      type: 'keyword',
      pattern:
        /\b(?:abstract|any|as|async|await|boolean|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|module|namespace|new|private|protected|public|readonly|return|set|static|string|super|switch|this|throw|try|type|typeof|var|void|while|with|yield)\b/g,
      className: 'syntax-keyword',
    },
    {
      type: 'boolean',
      pattern: /\b(?:true|false|null|undefined)\b/g,
      className: 'syntax-keyword',
    },
    {
      type: 'number',
      pattern: /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g,
      className: 'syntax-number',
    },
    {
      type: 'function',
      pattern: /\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()/g,
      className: 'syntax-function',
    },
    {
      type: 'type',
      pattern: /\b[A-Z][a-zA-Z0-9]*\b/g,
      className: 'syntax-type',
    },
    {
      type: 'operator',
      pattern:
        /[+\-*/%=!<>?:&|^~]+|===|!==|==|!=|<=|>=|\|\||&&|\+\+|--|=>|\.\.\./g,
      className: 'syntax-operator',
    },
  ],

  html: [
    {
      type: 'comment',
      pattern: /<!--[\s\S]*?-->/g,
      className: 'syntax-comment',
    },
    {
      type: 'tag',
      pattern: /<\/?[a-zA-Z][a-zA-Z0-9-]*\b/g,
      className: 'syntax-tag',
    },
    {
      type: 'elb-attribute',
      pattern: /\bdata-elb[a-zA-Z-]*(?==)/g,
      className: 'syntax-elb-attribute',
    },
    {
      type: 'elb-value',
      pattern:
        /(?<=data-elb[a-zA-Z-]*=)"[^"]*"|(?<=data-elb[a-zA-Z-]*=)'[^']*'/g,
      className: 'syntax-elb-value',
    },
    {
      type: 'attribute',
      pattern: /\b[a-zA-Z-]+(?==)/g,
      className: 'syntax-attribute',
    },
    { type: 'value', pattern: /"[^"]*"|'[^']*'/g, className: 'syntax-value' },
  ],

  json: [
    {
      type: 'key',
      pattern: /"(?:\\.|[^"\\])*"(?=\s*:)/g,
      className: 'syntax-attribute',
    },
    {
      type: 'string',
      pattern: /"(?:\\.|[^"\\])*"/g,
      className: 'syntax-string',
    },
    {
      type: 'number',
      pattern: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g,
      className: 'syntax-number',
    },
    {
      type: 'boolean',
      pattern: /\b(true|false|null)\b/g,
      className: 'syntax-keyword',
    },
  ],

  css: [
    {
      type: 'comment',
      pattern: /\/\*[\s\S]*?\*\//g,
      className: 'syntax-comment',
    },
    {
      type: 'selector',
      pattern: /[.#]?[a-zA-Z][\w-]*(?=\s*\{)/g,
      className: 'syntax-tag',
    },
    {
      type: 'property',
      pattern: /(?<=\{|\;)\s*[a-zA-Z-]+(?=\s*:)/g,
      className: 'syntax-property',
    },
    {
      type: 'value',
      pattern: /(?<=:\s*)[^;}]+/g,
      className: 'syntax-string',
    },
    {
      type: 'unit',
      pattern: /\b\d+(?:px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch|fr)\b/g,
      className: 'syntax-number',
    },
    {
      type: 'color',
      pattern:
        /#[0-9a-fA-F]{3,6}\b|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g,
      className: 'syntax-number',
    },
  ],

  text: [],
};

/**
 * Highlight syntax for given language
 */
export function highlightSyntax(
  code: string,
  language: SupportedLanguage = 'text',
): string {
  if (language === 'text' || !code.trim()) {
    return escapeHtml(code);
  }

  const definition = languageDefinitions[language];
  if (!definition) {
    return escapeHtml(code);
  }

  // Collect all matches with their positions
  const matches: Array<{
    start: number;
    end: number;
    type: string;
    className: string;
    content: string;
  }> = [];

  definition.forEach(({ type, pattern, className }) => {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type,
        className,
        content: match[0],
      });
    }
  });

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches (keep the first one)
  const filteredMatches = [];
  let lastEnd = 0;

  for (const match of matches) {
    if (match.start >= lastEnd) {
      filteredMatches.push(match);
      lastEnd = match.end;
    }
  }

  // Build highlighted HTML
  let result = '';
  let currentPos = 0;

  for (const match of filteredMatches) {
    // Add text before the match
    if (match.start > currentPos) {
      result += escapeHtml(code.slice(currentPos, match.start));
    }

    // Add highlighted match
    result += `<span class="${match.className}">${escapeHtml(match.content)}</span>`;
    currentPos = match.end;
  }

  // Add remaining text
  if (currentPos < code.length) {
    result += escapeHtml(code.slice(currentPos));
  }

  return result;
}

/**
 * Get language from file extension or MIME type
 */
export function detectLanguage(filename: string): SupportedLanguage {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    default:
      return 'text';
  }
}

/**
 * Format code with basic indentation
 */
export function formatCode(
  code: string,
  language: SupportedLanguage,
  indentSize = 2,
): string {
  if (language === 'json') {
    try {
      return JSON.stringify(JSON.parse(code), null, indentSize);
    } catch {
      return code; // Return original if parsing fails
    }
  }

  if (language === 'html') {
    return formatHTML(code, indentSize);
  }

  // Basic formatting for other languages
  return code
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * Format HTML with proper indentation
 */
function formatHTML(html: string, indentSize = 2): string {
  const tab = ' '.repeat(indentSize);
  let result = '';
  let indent = 0;

  // Split by tags but preserve content
  const tokens = html.split(/(<\/?[^>]+>)/g).filter((token) => token.trim());

  for (const token of tokens) {
    if (token.startsWith('</')) {
      // Closing tag
      indent = Math.max(0, indent - 1);
      result += tab.repeat(indent) + token + '\n';
    } else if (
      token.startsWith('<') &&
      !token.endsWith('/>') &&
      !token.includes('</')
    ) {
      // Opening tag
      result += tab.repeat(indent) + token + '\n';
      indent++;
    } else if (token.startsWith('<')) {
      // Self-closing tag
      result += tab.repeat(indent) + token + '\n';
    } else {
      // Content
      const trimmed = token.trim();
      if (trimmed) {
        result += tab.repeat(indent) + trimmed + '\n';
      }
    }
  }

  return result.trim();
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Get CSS for syntax highlighting
 */
export function getSyntaxHighlightCSS(): string {
  return `
/* Syntax highlighting styles */
.syntax-keyword { 
  color: #d73a49 !important; 
  font-weight: 600; 
}

.syntax-string { 
  color: #032f62 !important; 
}

.syntax-number { 
  color: #005cc5 !important; 
}

.syntax-comment { 
  color: #6a737d !important; 
  font-style: italic; 
}

.syntax-function {
  color: #6f42c1 !important;
  font-weight: 500;
}

.syntax-tag { 
  color: #22863a !important; 
  font-weight: 600; 
}

.syntax-attribute { 
  color: #6f42c1 !important; 
}

.syntax-value { 
  color: #032f62 !important; 
}

.syntax-operator { 
  color: #d73a49 !important; 
}

.syntax-type { 
  color: #005cc5 !important; 
  font-weight: 500; 
}

.syntax-property { 
  color: #6f42c1 !important; 
}

/* Special highlighting for elb attributes */
.syntax-elb-attribute { 
  color: #28a745 !important; 
  font-weight: 700; 
}

.syntax-elb-value { 
  color: #28a745 !important; 
  font-weight: 500; 
}
`;
}

/**
 * Create a syntax-highlighted code block
 */
export function createCodeBlock(
  code: string,
  language: SupportedLanguage = 'text',
  options: {
    showLineNumbers?: boolean;
    className?: string;
    maxHeight?: string;
  } = {},
): HTMLElement {
  const pre = document.createElement('pre');
  const codeElement = document.createElement('code');

  // Set classes
  pre.className = `syntax-highlight ${options.className || ''}`;
  codeElement.className = `language-${language}`;

  // Add line numbers if requested
  if (options.showLineNumbers) {
    const lines = code.split('\n');
    const lineNumbers = lines.map((_, i) => i + 1).join('\n');

    const lineNumbersEl = document.createElement('span');
    lineNumbersEl.className = 'line-numbers';
    lineNumbersEl.textContent = lineNumbers;

    pre.appendChild(lineNumbersEl);
    pre.classList.add('with-line-numbers');
  }

  // Highlight and set content
  codeElement.innerHTML = highlightSyntax(code, language);
  pre.appendChild(codeElement);

  // Set max height if specified
  if (options.maxHeight) {
    pre.style.maxHeight = options.maxHeight;
    pre.style.overflow = 'auto';
  }

  return pre;
}

/**
 * Extract tokens from code for advanced processing
 */
export function tokenize(
  code: string,
  language: SupportedLanguage,
): SyntaxToken[] {
  const definition = languageDefinitions[language];
  if (!definition) {
    return [{ type: 'text', value: code, start: 0, end: code.length }];
  }

  const tokens: SyntaxToken[] = [];
  const matches: Array<{
    start: number;
    end: number;
    type: string;
    value: string;
  }> = [];

  // Collect all matches
  definition.forEach(({ type, pattern }) => {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type,
        value: match[0],
      });
    }
  });

  // Sort and filter overlapping matches
  matches.sort((a, b) => a.start - b.start);

  let currentPos = 0;
  for (const match of matches) {
    if (match.start >= currentPos) {
      // Add text token before this match
      if (match.start > currentPos) {
        tokens.push({
          type: 'text',
          value: code.slice(currentPos, match.start),
          start: currentPos,
          end: match.start,
        });
      }

      // Add the match token
      tokens.push({
        type: match.type,
        value: match.value,
        start: match.start,
        end: match.end,
      });

      currentPos = match.end;
    }
  }

  // Add remaining text
  if (currentPos < code.length) {
    tokens.push({
      type: 'text',
      value: code.slice(currentPos),
      start: currentPos,
      end: code.length,
    });
  }

  return tokens;
}
