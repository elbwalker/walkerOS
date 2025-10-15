import React, { useState, useCallback, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';

// Auto-import CSS
import '../../styles/mapping-demo.css';

// NOTE: Monaco Editor configuration (workers, etc.) must be handled by the consuming application.
// See apps/explorer/demo/main.tsx for an example with Vite

export interface MappingDemoProps {
  input?: string;
  config?: string;
  labelInput?: string;
  labelConfig?: string;
  labelOutput?: string;
  fn?: (input: string, config: string) => Promise<string>;
  theme?: 'light' | 'dark' | 'vs' | 'vs-dark';
}

/**
 * MappingDemo - Interactive dual-editor component with Monaco Editor
 *
 * A generic component with two editable JSON editors and one output display.
 * Requires a transformation function to process input+config into output.
 *
 * Props:
 * - input: Initial JSON string for left editor (default: '{}')
 * - config: Initial JSON string for middle editor (default: '{}')
 * - labelInput: Label for input editor (default: "Input")
 * - labelConfig: Label for config editor (default: "Config")
 * - labelOutput: Label for output editor (default: "Output")
 * - fn: Transformation function (input, config) => Promise<string> (required for output)
 *
 * Example:
 * ```tsx
 * <MappingDemo
 *   input='{ "name": "example" }'
 *   config='{ "transform": "uppercase" }'
 *   labelInput="Data"
 *   labelConfig="Rules"
 *   labelOutput="Result"
 *   fn={async (input, config) => {
 *     const data = JSON.parse(input);
 *     const rules = JSON.parse(config);
 *     // Your transformation logic
 *     return JSON.stringify(result, null, 2);
 *   }}
 * />
 * ```
 */

interface CodeBoxProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  theme?: string;
}

function CodeBox({
  label,
  value,
  onChange,
  disabled = false,
  theme = 'light',
}: CodeBoxProps) {
  // Map theme names: light/dark → vs-light/vs-dark for Monaco
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';

  const formatJson = () => {
    if (disabled || !onChange) return;
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
    } catch (error) {
      // Invalid JSON, don't format
    }
  };

  return (
    <div className="elb-explorer-mapping-box">
      <div className="elb-explorer-mapping-header">
        <span className="elb-explorer-mapping-label">{label}</span>
        {!disabled && (
          <button
            className="elb-explorer-mapping-btn"
            onClick={formatJson}
            title="Format JSON"
            type="button"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        )}
      </div>
      <div className="elb-explorer-mapping-editor">
        {/* @ts-expect-error - Monaco Editor React type mismatch */}
        <Editor
          height="100%"
          language="json"
          value={value}
          onChange={(val) => onChange?.(val || '')}
          theme={monacoTheme}
          options={{
            readOnly: disabled,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            automaticLayout: true,
            tabSize: 2,
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              alwaysConsumeMouseWheel: false,
            },
          }}
        />
      </div>
    </div>
  );
}

export function MappingDemo({
  input: initialInput = '{}',
  config: initialConfig = '{}',
  labelInput = 'Input',
  labelConfig = 'Config',
  labelOutput = 'Output',
  fn,
  theme = 'light',
}: MappingDemoProps = {}) {
  const [input, setInput] = useState(initialInput);
  const [config, setConfig] = useState(initialConfig);
  const [output, setOutput] = useState('');

  const updateOutput = useCallback(async () => {
    try {
      if (fn) {
        // Use custom function if provided
        const result = await fn(input, config);
        setOutput(result);
      } else {
        // Default behavior: just show the parsed JSON
        setOutput('No transformation function provided');
      }
    } catch (error) {
      setOutput(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [input, config, fn]);

  useEffect(() => {
    const timeoutId = setTimeout(updateOutput, 500);
    return () => clearTimeout(timeoutId);
  }, [updateOutput]);

  return (
    <div className="elb-explorer-mapping">
      <div className="elb-explorer-mapping-grid">
        <CodeBox
          label={labelInput}
          value={input}
          onChange={setInput}
          theme={theme}
        />
        <CodeBox
          label={labelConfig}
          value={config}
          onChange={setConfig}
          theme={theme}
        />
        <CodeBox label={labelOutput} value={output} disabled theme={theme} />
      </div>
    </div>
  );
}
