import React, { type FC, type PropsWithChildren, Children } from 'react';
import { CodeBox } from '../molecules/code-box';

interface MDXCodeProps {
  className?: string;
}

/**
 * MDXCode - Code component for MDX files
 *
 * Automatically detects and renders inline vs block code:
 * - Inline code: `example` → <code className="elb-code-inline">
 * - Block code: ```language\ncode\n``` → Uses CodeBox with Monaco editor
 *
 * Language detection:
 * - Extracts language from className (e.g., "language-typescript")
 * - Maps common MDX language names to Monaco language IDs
 *
 * Block code features (via CodeBox):
 * - Full Monaco editor with syntax highlighting
 * - Theme-aware (Palenight dark, VS Light)
 * - Copy to clipboard button
 * - Auto-height to fit content
 * - Read-only mode
 *
 * @example
 * // In MDX files (no import needed with MDXProvider):
 * Inline `code` example
 *
 * ```typescript
 * const block = "code";
 * ```
 */
export const MDXCode: FC<PropsWithChildren<MDXCodeProps>> = ({
  className,
  children,
}) => {
  // Detect if this is block code based on:
  // 1. Has className (markdown sets "language-*" for code blocks)
  // 2. Content contains newlines
  const childrenArray = Children.toArray(children);
  const hasClassName = typeof className === 'string';

  // Check if content has newlines (block code)
  const hasNewlines = childrenArray.some((child) => {
    if (typeof child === 'string') {
      return child.match(/[\n\r]/g);
    }
    return false;
  });

  // Inline code: no className or no newlines
  if (!hasClassName || !hasNewlines) {
    return <code className="elb-code-inline">{children}</code>;
  }

  // Block code: extract language from className
  // Format: "language-typescript" → "typescript"
  const mdxLanguage = className.replace(/^language-/, '');

  // Map MDX language names to Monaco language IDs
  const languageMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    bash: 'shell',
    sh: 'shell',
    yml: 'yaml',
    md: 'markdown',
  };

  const monacoLanguage = languageMap[mdxLanguage] || mdxLanguage;

  // Extract code string from children
  const code = childrenArray
    .map((child) => (typeof child === 'string' ? child : ''))
    .join('')
    .trim();

  return (
    <CodeBox
      code={code}
      language={monacoLanguage}
      disabled
      showCopy
      showHeader={false}
      autoHeight={{ min: 100, max: 600 }}
    />
  );
};
