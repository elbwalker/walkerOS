import { useState, useEffect } from 'react';
import { CodeBox, type CodeBoxProps } from './code-box';
import { formatCode } from '../../utils/format-code';

export type CodeSnippetProps = Omit<CodeBoxProps, 'label' | 'showHeader'> & {
  format?: boolean;
};

/**
 * CodeSnippet - Prominent code display for snippets
 *
 * Wraps CodeBox with larger font size and generous padding.
 * Use this for showcasing code examples, one-liners, or small code blocks
 * where you want the code to be more visually prominent than in a standard editor.
 *
 * Always renders without a header. Use CodeBox if you need a header.
 *
 * Default behavior:
 * - Read-only (disabled=true)
 * - Copy button enabled (showCopy=true)
 * - Auto-height with sensible bounds (min: 20px, max: 600px)
 * - Auto-format on mount (format=true) - formats code once on initial load
 *
 * Auto-Formatting:
 * - Enabled by default (format=true)
 * - Runs once on component mount using Monaco's built-in formatters
 * - Supports: JavaScript, TypeScript, JSON, HTML, CSS
 * - Use format={false} to disable for special cases (pre-formatted code)
 *
 * Reuses all CodeBox functionality:
 * - Monaco Editor with syntax highlighting
 * - Grid height management and auto-height modes
 * - Copy button
 * - Theme integration
 *
 * @example
 * // Minimal usage - code auto-formats on load
 * <CodeSnippet
 *   code="import { elb } from '@walkeros/core';"
 *   language="javascript"
 * />
 *
 * @example
 * // Disable auto-formatting for pre-formatted code
 * <CodeSnippet
 *   code={alreadyFormattedCode}
 *   language="javascript"
 *   format={false}
 * />
 *
 * @example
 * // Override defaults if needed
 * <CodeSnippet
 *   code={editableCode}
 *   language="javascript"
 *   disabled={false}
 *   showCopy={false}
 *   autoHeight={{ min: 100, max: 800 }}
 * />
 */
export function CodeSnippet(props: CodeSnippetProps) {
  const {
    code,
    language = 'javascript',
    className,
    disabled = true,
    showCopy = true,
    autoHeight = { min: 20, max: 600 },
    fontSize = 15,
    format = true,
    ...rest
  } = props;
  const snippetClassName = `elb-code-snippet ${className || ''}`.trim();
  const [formattedCode, setFormattedCode] = useState(code);

  // Format code on mount
  useEffect(() => {
    if (format && code) {
      formatCode(code, language).then(setFormattedCode);
    } else {
      setFormattedCode(code);
    }
  }, [code, language, format]);

  return (
    <CodeBox
      {...rest}
      code={formattedCode}
      language={language}
      className={snippetClassName}
      showHeader={false}
      disabled={disabled}
      showCopy={showCopy}
      autoHeight={autoHeight}
      fontSize={fontSize}
    />
  );
}
