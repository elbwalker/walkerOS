import React, { type ComponentType, useEffect, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { Box } from '../atoms/box';

export interface CodeBoxProps {
  code: string;
  language?: string;
  label?: string;
  onChange?: (code: string) => void;
  disabled?: boolean;
  showCopy?: boolean;
  showFormat?: boolean;
  className?: string;
  height?: number | string;
  minHeight?: number | string;
}

/**
 * CodeBox - Single reusable component for displaying code
 *
 * Combines functionality of Code, CodePanel, and CodeEditor into one component.
 * Can be used for both editable and read-only code display.
 *
 * @example
 * // Read-only display
 * <CodeBox code="const x = 1;" language="javascript" label="Example" />
 *
 * // Editable
 * <CodeBox code={value} onChange={setValue} language="json" label="Config" showFormat />
 *
 * // With copy button
 * <CodeBox code="const x = 1;" showCopy label="Code" />
 */
export function CodeBox({
  code,
  language = 'javascript',
  label = 'Code',
  onChange,
  disabled = false,
  showCopy = false,
  showFormat = false,
  className,
  height,
  minHeight,
}: CodeBoxProps) {
  const [monacoTheme, setMonacoTheme] = useState('vs-light');
  const [copied, setCopied] = useState(false);

  // Theme detection
  useEffect(() => {
    const checkTheme = () => {
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body.getAttribute('data-theme') === 'dark';
      setMonacoTheme(isDark ? 'vs-dark' : 'vs-light');
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const handleChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleFormat = () => {
    if (!onChange || disabled || language !== 'json') return;

    try {
      const parsed = JSON.parse(code);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
    } catch (e) {
      // Invalid JSON, do nothing
    }
  };

  // Build header actions
  const actions = (
    <>
      {showFormat && !disabled && language === 'json' && (
        <button
          className="elb-explorer-btn"
          onClick={handleFormat}
          title="Format JSON"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </button>
      )}
      {showCopy && (
        <button
          className="elb-explorer-btn"
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      )}
    </>
  );

  const MonacoEditor = Editor as ComponentType<{
    height: string;
    language: string;
    value: string;
    onChange: (value: string | undefined) => void;
    theme: string;
    options: Record<string, unknown>;
  }>;

  const boxStyle: React.CSSProperties = {};
  if (height !== undefined) {
    boxStyle.height = typeof height === 'number' ? `${height}px` : height;
  }
  if (minHeight !== undefined) {
    boxStyle.minHeight =
      typeof minHeight === 'number' ? `${minHeight}px` : minHeight;
  }

  return (
    <Box
      header={label}
      headerActions={actions}
      className={className}
      style={Object.keys(boxStyle).length > 0 ? boxStyle : undefined}
    >
      <MonacoEditor
        height="100%"
        language={language}
        value={code}
        onChange={handleChange}
        theme={monacoTheme}
        options={{
          readOnly: disabled || !onChange,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          lineNumbersMinChars: 2,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'off',
          fixedOverflowWidgets: true,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            alwaysConsumeMouseWheel: false,
          },
        }}
      />
    </Box>
  );
}
