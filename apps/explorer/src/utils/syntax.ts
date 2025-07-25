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
        /\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/g,
      className: 'syntax-keyword',
    },
    { type: 'number', pattern: /\b\d+(\.\d+)?\b/g, className: 'syntax-number' },
    {
      type: 'boolean',
      pattern: /\b(true|false|null|undefined)\b/g,
      className: 'syntax-keyword',
    },
    {
      type: 'operator',
      pattern: /[+\-*/%=!<>?:&|^~]/g,
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
        /\b(abstract|any|as|async|await|boolean|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|module|namespace|new|null|number|private|protected|public|readonly|return|set|static|string|super|switch|this|throw|true|try|type|typeof|undefined|var|void|while|with|yield)\b/g,
      className: 'syntax-keyword',
    },
    { type: 'number', pattern: /\b\d+(\.\d+)?\b/g, className: 'syntax-number' },
    {
      type: 'type',
      pattern: /\b[A-Z][a-zA-Z0-9]*\b/g,
      className: 'syntax-type',
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

  css: [
    {
      type: 'comment',
      pattern: /\/\*[\s\S]*?\*\//g,
      className: 'syntax-comment',
    },
    {
      type: 'selector',
      pattern: /[^{}]+(?=\s*\{)/g,
      className: 'syntax-selector',
    },
    {
      type: 'property',
      pattern: /[a-zA-Z-]+(?=\s*:)/g,
      className: 'syntax-property',
    },
    { type: 'value', pattern: /(?<=:)[^;]+/g, className: 'syntax-value' },
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
    case 'scss':
    case 'sass':
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
  color: var(--explorer-syntax-keyword, #9333ea); 
  font-weight: 600; 
}

.syntax-string { 
  color: var(--explorer-syntax-string, #059669); 
}

.syntax-number { 
  color: var(--explorer-syntax-number, #2563eb); 
}

.syntax-comment { 
  color: var(--explorer-syntax-comment, #6b7280); 
  font-style: italic; 
}

.syntax-tag { 
  color: var(--explorer-syntax-tag, #2563eb); 
  font-weight: 600; 
}

.syntax-attribute { 
  color: var(--explorer-syntax-attribute, #9333ea); 
}

.syntax-value { 
  color: var(--explorer-syntax-value, #059669); 
}

.syntax-operator { 
  color: var(--explorer-text-secondary, #374151); 
}

.syntax-type { 
  color: var(--explorer-syntax-keyword, #9333ea); 
  font-weight: 500; 
}

.syntax-property { 
  color: var(--explorer-syntax-attribute, #9333ea); 
}

.syntax-selector { 
  color: var(--explorer-syntax-tag, #2563eb); 
  font-weight: 600; 
}

/* Special highlighting for elb attributes */
.syntax-elb-attribute { 
  color: var(--explorer-interactive-success, #10b981); 
  font-weight: 700; 
}

.syntax-elb-value { 
  color: var(--explorer-interactive-success, #10b981); 
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
