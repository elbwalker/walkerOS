import React from 'react';
import { CodeView } from './code-view';

export interface CodeSnippetProps {
  code: string;
  language?: string;
  className?: string;
}

/**
 * CodeSnippet - Prominent, read-only code display for snippets.
 *
 * Renders code with the static Shiki path (CodeView without a header), so the
 * highlighted code is present in server-rendered HTML and in the llms.txt
 * markdown export. Use this for showcasing install/usage commands, one-liners,
 * or small code blocks on docs pages.
 *
 * Read-only with a copy button. Snippets are expected to be authored
 * pre-formatted; no client-side reformatting happens (which would otherwise
 * mutate text only on the client and cause a hydration mismatch).
 *
 * Uses a slightly larger font size (15px) than the default code view, scoped to
 * the `.elb-code-snippet` wrapper.
 *
 * @example
 * <CodeSnippet
 *   code="import { elb } from '@walkeros/core';"
 *   language="javascript"
 * />
 */
export function CodeSnippet({
  code,
  language = 'javascript',
  className,
}: CodeSnippetProps) {
  const snippetClassName = `elb-code-snippet ${className || ''}`.trim();

  return (
    <CodeView
      code={code}
      language={language}
      className={snippetClassName}
      showHeader={false}
      showCopy
    />
  );
}
