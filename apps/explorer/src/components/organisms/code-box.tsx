import React, { type ComponentType, useEffect, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Box } from '../atoms/box';
import { useMonacoHeight } from '../../hooks/useMonacoHeight';
import { registerPalenightTheme } from '../../themes/palenight';

export interface CodeBoxProps {
  code: string;
  language?: string;
  label?: string;
  onChange?: (code: string) => void;
  disabled?: boolean;
  showCopy?: boolean;
  showFormat?: boolean;
  lineNumbers?: boolean;
  folding?: boolean;
  className?: string;
  height?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  autoHeight?: boolean;
  showHeader?: boolean; // Show box header (default: true)
}

/**
 * CodeBox - Single reusable component for displaying code
 *
 * Combines functionality of Code, CodePanel, and CodeEditor into one component.
 * Can be used for both editable and read-only code display.
 *
 * Height Behavior:
 * - Default: Fixed 400px height (from CSS)
 * - autoHeight: Dynamically adjusts to content (min: 100px, max: 800px)
 * - height prop: Custom fixed height
 * - minHeight/maxHeight: Constraints for autoHeight mode
 *
 * @example
 * // Read-only display
 * <CodeBox code="const x = 1;" language="javascript" label="Example" />
 *
 * // Editable
 * <CodeBox code={value} onChange={setValue} language="json" label="Config" showFormat />
 *
 * // Auto-height for short content
 * <CodeBox code={shortCode} autoHeight label="Snippet" />
 *
 * // Custom height constraints
 * <CodeBox code={code} autoHeight minHeight={150} maxHeight={500} />
 */
export function CodeBox({
  code,
  language = 'javascript',
  label = 'Code',
  onChange,
  disabled = false,
  showCopy = false,
  showFormat = false,
  lineNumbers = false,
  folding = false,
  className,
  height,
  minHeight,
  maxHeight,
  autoHeight = false,
  showHeader = true,
}: CodeBoxProps) {
  const [monacoTheme, setMonacoTheme] = useState('vs-light');
  const [copied, setCopied] = useState(false);

  // Auto-height calculation
  const minHeightNum = typeof minHeight === 'number' ? minHeight : 100;
  const maxHeightNum = typeof maxHeight === 'number' ? maxHeight : 800;
  const defaultHeightNum = typeof height === 'number' ? height : 400;

  const [calculatedHeight, setEditor] = useMonacoHeight({
    enabled: autoHeight,
    minHeight: minHeightNum,
    maxHeight: maxHeightNum,
    defaultHeight: defaultHeightNum,
  });

  // Theme detection
  useEffect(() => {
    const checkTheme = () => {
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body.getAttribute('data-theme') === 'dark';
      setMonacoTheme(isDark ? 'palenight' : 'vs-light');
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

  const handleBeforeMount = (monaco: typeof import('monaco-editor')) => {
    registerPalenightTheme(monaco);
  };

  const MonacoEditor = Editor as ComponentType<{
    height: string;
    language: string;
    value: string;
    onChange: (value: string | undefined) => void;
    beforeMount?: (monaco: typeof import('monaco-editor')) => void;
    onMount?: (editor: editor.IStandaloneCodeEditor) => void;
    theme: string;
    options: Record<string, unknown>;
  }>;

  const boxStyle: React.CSSProperties = {};
  if (autoHeight) {
    // Use calculated height from hook
    boxStyle.height = `${calculatedHeight}px`;
  } else if (height !== undefined) {
    // Use custom height
    boxStyle.height = typeof height === 'number' ? `${height}px` : height;
  }
  // Note: minHeight/maxHeight only used in autoHeight mode, not applied to box directly

  const handleEditorMount = (monacoEditor: editor.IStandaloneCodeEditor) => {
    if (autoHeight) {
      setEditor(monacoEditor);
    }
  };

  return (
    <Box
      header={label}
      headerActions={actions}
      className={className}
      style={Object.keys(boxStyle).length > 0 ? boxStyle : undefined}
      showHeader={showHeader}
    >
      <MonacoEditor
        height="100%"
        language={language}
        value={code}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleEditorMount}
        theme={monacoTheme}
        options={{
          readOnly: disabled || !onChange,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: lineNumbers ? 'on' : 'off',
          lineNumbersMinChars: 2,
          folding: folding,
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
