/**
 * Syntax Highlighting Utilities
 * Lightweight token-based syntax highlighter
 */

import type { SyntaxToken } from '../types';

// Language definitions
const JAVASCRIPT_KEYWORDS = new Set([
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'null',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

const JAVASCRIPT_BUILTINS = new Set([
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'Function',
  'Symbol',
  'Promise',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'JSON',
  'Math',
  'Date',
  'RegExp',
  'Error',
  'console',
  'window',
  'document',
  'localStorage',
]);

/**
 * Tokenize JavaScript code
 */
export function tokenizeJavaScript(code: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  const regex =
    /(\b\w+\b|"[^"]*"|'[^']*'|`[^`]*`|\/\/.*$|\/\*[\s\S]*?\*\/|[+\-*/%=<>!&|?:;,(){}[\].])/gm;

  let match;
  let lastIndex = 0;

  while ((match = regex.exec(code)) !== null) {
    const [fullMatch] = match;
    const start = match.index;

    // Add any text before this match as default
    if (start > lastIndex) {
      tokens.push({
        type: 'default',
        value: code.substring(lastIndex, start),
        start: lastIndex,
        end: start,
      });
    }

    // Classify the token
    let type: SyntaxToken['type'] = 'default';

    if (fullMatch.startsWith('//') || fullMatch.startsWith('/*')) {
      type = 'comment';
    } else if (
      fullMatch.startsWith('"') ||
      fullMatch.startsWith("'") ||
      fullMatch.startsWith('`')
    ) {
      type = 'string';
    } else if (/^\d+(\.\d+)?$/.test(fullMatch)) {
      type = 'number';
    } else if (JAVASCRIPT_KEYWORDS.has(fullMatch)) {
      type = 'keyword';
    } else if (JAVASCRIPT_BUILTINS.has(fullMatch)) {
      type = 'function';
    } else if (/^[+\-*/%=<>!&|?:]/.test(fullMatch)) {
      type = 'operator';
    } else if (/^[;,(){}[\].]/.test(fullMatch)) {
      type = 'punctuation';
    }

    tokens.push({
      type,
      value: fullMatch,
      start,
      end: start + fullMatch.length,
    });

    lastIndex = regex.lastIndex;
  }

  // Add any remaining text
  if (lastIndex < code.length) {
    tokens.push({
      type: 'default',
      value: code.substring(lastIndex),
      start: lastIndex,
      end: code.length,
    });
  }

  return tokens;
}

/**
 * Tokenize JSON
 */
export function tokenizeJSON(code: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  const regex =
    /("(?:[^"\\]|\\.)*"|\btrue\b|\bfalse\b|\bnull\b|\b\d+(\.\d+)?([eE][+-]?\d+)?\b|[{}[\]:,])/g;

  let match;
  let lastIndex = 0;

  while ((match = regex.exec(code)) !== null) {
    const [fullMatch] = match;
    const start = match.index;

    // Add whitespace before match
    if (start > lastIndex) {
      tokens.push({
        type: 'default',
        value: code.substring(lastIndex, start),
        start: lastIndex,
        end: start,
      });
    }

    let type: SyntaxToken['type'] = 'default';

    if (fullMatch.startsWith('"')) {
      // Check if it's a property key or value
      const beforeMatch = code.substring(0, start).trimEnd();
      type = beforeMatch.endsWith(':') ? 'string' : 'keyword';
    } else if (/^(true|false|null)$/.test(fullMatch)) {
      type = 'keyword';
    } else if (/^\d/.test(fullMatch)) {
      type = 'number';
    } else if (/^[{}[\]]/.test(fullMatch)) {
      type = 'punctuation';
    } else if (fullMatch === ':' || fullMatch === ',') {
      type = 'operator';
    }

    tokens.push({
      type,
      value: fullMatch,
      start,
      end: start + fullMatch.length,
    });

    lastIndex = start + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < code.length) {
    tokens.push({
      type: 'default',
      value: code.substring(lastIndex),
      start: lastIndex,
      end: code.length,
    });
  }

  return tokens;
}

/**
 * Tokenize HTML with proper attribute parsing
 */
export function tokenizeHTML(code: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let position = 0;

  while (position < code.length) {
    // Find next tag or comment
    const nextTag = code.indexOf('<', position);

    if (nextTag === -1) {
      // No more tags, add remaining text
      if (position < code.length) {
        tokens.push({
          type: 'default',
          value: code.substring(position),
          start: position,
          end: code.length,
        });
      }
      break;
    }

    // Add text before tag
    if (nextTag > position) {
      tokens.push({
        type: 'default',
        value: code.substring(position, nextTag),
        start: position,
        end: nextTag,
      });
    }

    // Parse the tag
    const tagEnd = code.indexOf('>', nextTag);
    if (tagEnd === -1) {
      // Malformed tag, treat as text
      tokens.push({
        type: 'default',
        value: code.substring(nextTag),
        start: nextTag,
        end: code.length,
      });
      break;
    }

    const tagContent = code.substring(nextTag, tagEnd + 1);

    // Handle comments
    if (tagContent.startsWith('<!--')) {
      tokens.push({
        type: 'comment',
        value: tagContent,
        start: nextTag,
        end: tagEnd + 1,
      });
      position = tagEnd + 1;
      continue;
    }

    // Parse regular tag
    parseHTMLTag(tagContent, nextTag, tokens);
    position = tagEnd + 1;
  }

  return tokens;
}

/**
 * Parse individual HTML tag into tokens
 */
function parseHTMLTag(
  tagContent: string,
  startPos: number,
  tokens: SyntaxToken[],
): void {
  let position = 0;
  const tagLength = tagContent.length;

  // Opening bracket
  tokens.push({
    type: 'punctuation',
    value: '<',
    start: startPos,
    end: startPos + 1,
  });
  position = 1;

  // Check for closing tag
  let isClosingTag = false;
  if (tagContent[1] === '/') {
    tokens.push({
      type: 'punctuation',
      value: '/',
      start: startPos + 1,
      end: startPos + 2,
    });
    position = 2;
    isClosingTag = true;
  }

  // Tag name
  const tagNameMatch = tagContent.substring(position).match(/^(\w+)/);
  if (tagNameMatch) {
    const tagName = tagNameMatch[1];
    tokens.push({
      type: 'keyword',
      value: tagName,
      start: startPos + position,
      end: startPos + position + tagName.length,
    });
    position += tagName.length;
  }

  // Don't parse attributes for closing tags
  if (isClosingTag) {
    // Skip to closing bracket
    while (position < tagLength - 1) {
      if (
        tagContent[position] !== ' ' &&
        tagContent[position] !== '\t' &&
        tagContent[position] !== '\n'
      ) {
        tokens.push({
          type: 'default',
          value: tagContent[position],
          start: startPos + position,
          end: startPos + position + 1,
        });
      }
      position++;
    }
  } else {
    // Parse attributes
    position = parseHTMLAttributes(tagContent, position, startPos, tokens);
  }

  // Self-closing tag slash
  if (position < tagLength - 1 && tagContent[tagLength - 2] === '/') {
    // Add any whitespace before slash
    if (position < tagLength - 2) {
      const whitespace = tagContent.substring(position, tagLength - 2);
      if (whitespace.trim() === '') {
        position = tagLength - 2;
      }
    }

    tokens.push({
      type: 'punctuation',
      value: '/',
      start: startPos + tagLength - 2,
      end: startPos + tagLength - 1,
    });
  }

  // Closing bracket
  tokens.push({
    type: 'punctuation',
    value: '>',
    start: startPos + tagLength - 1,
    end: startPos + tagLength,
  });
}

/**
 * Parse HTML attributes within a tag
 */
function parseHTMLAttributes(
  tagContent: string,
  startPos: number,
  tagStartPos: number,
  tokens: SyntaxToken[],
): number {
  let position = startPos;
  const tagLength = tagContent.length;

  while (position < tagLength - 1) {
    const char = tagContent[position];

    // Capture and preserve whitespace
    if (char === ' ' || char === '\t' || char === '\n') {
      const whitespaceStart = position;
      while (position < tagLength && /\s/.test(tagContent[position])) {
        position++;
      }
      // Add whitespace as default token to preserve it
      if (position > whitespaceStart) {
        tokens.push({
          type: 'default',
          value: tagContent.substring(whitespaceStart, position),
          start: tagStartPos + whitespaceStart,
          end: tagStartPos + position,
        });
      }
      continue;
    }

    // Stop at closing bracket or self-closing slash
    if (char === '>' || char === '/') {
      break;
    }

    // Parse attribute name
    const attrMatch = tagContent.substring(position).match(/^([a-zA-Z-]+)/);
    if (attrMatch) {
      const attrName = attrMatch[1];
      const isDataElb = attrName.startsWith('data-elb');

      tokens.push({
        type: isDataElb ? 'function' : 'number', // data-elb = purple, regular attrs = blue
        value: attrName,
        start: tagStartPos + position,
        end: tagStartPos + position + attrName.length,
      });
      position += attrName.length;

      // Handle whitespace around equals sign
      const whitespaceBeforeEquals = position;
      while (position < tagLength && /\s/.test(tagContent[position])) {
        position++;
      }
      if (position > whitespaceBeforeEquals) {
        tokens.push({
          type: 'default',
          value: tagContent.substring(whitespaceBeforeEquals, position),
          start: tagStartPos + whitespaceBeforeEquals,
          end: tagStartPos + position,
        });
      }

      // Check for equals sign
      if (position < tagLength && tagContent[position] === '=') {
        tokens.push({
          type: 'operator',
          value: '=',
          start: tagStartPos + position,
          end: tagStartPos + position + 1,
        });
        position++;

        // Handle whitespace after equals sign
        const whitespaceAfterEquals = position;
        while (position < tagLength && /\s/.test(tagContent[position])) {
          position++;
        }
        if (position > whitespaceAfterEquals) {
          tokens.push({
            type: 'default',
            value: tagContent.substring(whitespaceAfterEquals, position),
            start: tagStartPos + whitespaceAfterEquals,
            end: tagStartPos + position,
          });
        }

        // Parse attribute value
        if (position < tagLength) {
          const quote = tagContent[position];
          if (quote === '"' || quote === "'") {
            // Quoted value
            const valueEnd = tagContent.indexOf(quote, position + 1);
            if (valueEnd !== -1) {
              const fullValue = tagContent.substring(position, valueEnd + 1);
              tokens.push({
                type: 'string',
                value: fullValue,
                start: tagStartPos + position,
                end: tagStartPos + valueEnd + 1,
              });
              position = valueEnd + 1;
            } else {
              // Unclosed quote, treat as string to end
              tokens.push({
                type: 'string',
                value: tagContent.substring(position),
                start: tagStartPos + position,
                end: tagStartPos + tagLength,
              });
              break;
            }
          } else {
            // Unquoted value
            const valueMatch = tagContent
              .substring(position)
              .match(/^([^\s>]+)/);
            if (valueMatch) {
              const value = valueMatch[1];
              tokens.push({
                type: 'string',
                value: value,
                start: tagStartPos + position,
                end: tagStartPos + position + value.length,
              });
              position += value.length;
            }
          }
        }
      }
    } else {
      // Unknown character, add as default to preserve it
      tokens.push({
        type: 'default',
        value: char,
        start: tagStartPos + position,
        end: tagStartPos + position + 1,
      });
      position++;
    }
  }

  return position;
}

/**
 * Convert tokens to HTML with syntax highlighting
 */
export function tokensToHTML(tokens: SyntaxToken[]): string {
  return tokens
    .map((token) => {
      const escaped = escapeHTML(token.value);
      if (token.type === 'default') return escaped;
      return `<span class="elb-syntax-${token.type}">${escaped}</span>`;
    })
    .join('');
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Tokenize CSS
 */
export function tokenizeCSS(code: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  const regex =
    /(\/\*[\s\S]*?\*\/|"[^"]*"|'[^']*'|[{}:;]|#[\w-]+|\.[a-zA-Z][\w-]*|[a-zA-Z-]+:|@[a-zA-Z-]+|\d+(\.\d+)?(px|em|rem|%|vh|vw)?)/g;

  let match;
  let lastIndex = 0;

  while ((match = regex.exec(code)) !== null) {
    const [fullMatch] = match;
    const start = match.index;

    // Add text before match
    if (start > lastIndex) {
      tokens.push({
        type: 'default',
        value: code.substring(lastIndex, start),
        start: lastIndex,
        end: start,
      });
    }

    let type: SyntaxToken['type'] = 'default';

    if (fullMatch.startsWith('/*')) {
      type = 'comment';
    } else if (fullMatch.startsWith('"') || fullMatch.startsWith("'")) {
      type = 'string';
    } else if (fullMatch.startsWith('#')) {
      type = 'string'; // Color values
    } else if (fullMatch.startsWith('.')) {
      type = 'function'; // Class selectors
    } else if (fullMatch.includes(':')) {
      type = 'keyword'; // Property names
    } else if (fullMatch.startsWith('@')) {
      type = 'keyword'; // At-rules
    } else if (/^\d/.test(fullMatch)) {
      type = 'number'; // Values with units
    } else if (
      fullMatch === '{' ||
      fullMatch === '}' ||
      fullMatch === ':' ||
      fullMatch === ';'
    ) {
      type = 'punctuation';
    }

    tokens.push({
      type,
      value: fullMatch,
      start,
      end: start + fullMatch.length,
    });

    lastIndex = start + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < code.length) {
    tokens.push({
      type: 'default',
      value: code.substring(lastIndex),
      start: lastIndex,
      end: code.length,
    });
  }

  return tokens;
}

/**
 * Main highlighting function
 */
export function highlight(
  code: string,
  language: 'javascript' | 'json' | 'html' | 'css' = 'javascript',
): string {
  let tokens: SyntaxToken[];

  switch (language) {
    case 'json':
      tokens = tokenizeJSON(code);
      break;
    case 'html':
      tokens = tokenizeHTML(code);
      break;
    case 'css':
      tokens = tokenizeCSS(code);
      break;
    case 'javascript':
    default:
      tokens = tokenizeJavaScript(code);
      break;
  }

  return tokensToHTML(tokens);
}

/**
 * Add line numbers to code
 */
export function addLineNumbers(code: string): string {
  const lines = code.split('\n');
  return lines
    .map((line, i) => {
      const lineNum = String(i + 1).padStart(3, ' ');
      return `<span class="elb-line-number">${lineNum}</span>${line}`;
    })
    .join('\n');
}
