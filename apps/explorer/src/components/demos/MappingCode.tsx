import React, { useState, useCallback, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { getMappingEvent, getMappingValue, createEvent } from '@walkeros/core';
import type { Mapping, WalkerOS } from '@walkeros/core';

// Auto-import CSS
import '../../styles/mapping-demo.css';

export interface MappingCodeProps {
  input: string;
  config?: string;
  labelInput?: string;
  labelOutput?: string;
}

/**
 * MappingCode - Specialized component for walkerOS mapping demonstrations
 *
 * Similar to LiveCode but specifically for mapping transformations.
 * Shows input code and output result side-by-side with built-in mapping logic.
 *
 * Props:
 * - input: Code string to execute (can use await getMappingEvent, getMappingValue)
 * - config: Optional mapping configuration JSON
 * - labelInput: Label for input editor (default: "Configuration")
 * - labelOutput: Label for output display (default: "Result")
 *
 * Example:
 * ```tsx
 * <MappingCode
 *   input={`await getMappingEvent(
 *     { name: 'product view' },
 *     {
 *       product: {
 *         view: { name: 'product_viewed' }
 *       }
 *     }
 *   );`}
 * />
 * ```
 */

interface CodeBoxProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  language?: string;
}

function CodeBox({
  label,
  value,
  onChange,
  disabled = false,
  language = 'json',
}: CodeBoxProps) {
  const formatJson = () => {
    if (disabled || !onChange || language !== 'json') return;
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
        {!disabled && language === 'json' && (
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
          language={language}
          value={value}
          onChange={(val) => onChange?.(val || '')}
          theme="vs-light"
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
            },
          }}
        />
      </div>
    </div>
  );
}

export function MappingCode({
  input: initialInput,
  config,
  labelInput = 'Configuration',
  labelOutput = 'Result',
}: MappingCodeProps) {
  const [input, setInput] = useState(initialInput);
  const [output, setOutput] = useState('');

  const executeCode = useCallback(async () => {
    try {
      // Wrap input in async function and execute
      const asyncFunction = new Function(
        'getMappingEvent',
        'getMappingValue',
        'createEvent',
        `return (async () => {
          return ${input}
        })();`,
      );

      const result = await asyncFunction(
        getMappingEvent,
        getMappingValue,
        createEvent,
      );

      setOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setOutput(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [input, config]);

  useEffect(() => {
    const timeoutId = setTimeout(executeCode, 500);
    return () => clearTimeout(timeoutId);
  }, [executeCode]);

  return (
    <div className="elb-explorer-mapping">
      <div
        className="elb-explorer-mapping-grid"
        style={{ gridTemplateColumns: '1fr 1fr' }}
      >
        <CodeBox
          label={labelInput}
          value={input}
          onChange={setInput}
          language="javascript"
        />
        <CodeBox label={labelOutput} value={output} disabled language="json" />
      </div>
    </div>
  );
}
