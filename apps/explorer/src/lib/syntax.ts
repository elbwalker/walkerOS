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
 * Tokenize HTML
 */
export function tokenizeHTML(code: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  const regex = /<\/?(\w+)([^>]*)>|<!--[\s\S]*?-->|data-elb[^=]*="[^"]*"/g;

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

    if (fullMatch.startsWith('<!--')) {
      type = 'comment';
    } else if (fullMatch.startsWith('data-elb')) {
      type = 'function'; // Highlight data-elb attributes specially
    } else if (fullMatch.startsWith('<')) {
      type = 'keyword';
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
