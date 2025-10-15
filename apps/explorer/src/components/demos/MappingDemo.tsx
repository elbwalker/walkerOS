import React, { useState, useCallback, useEffect } from 'react';
import { Editor, loader } from '@monaco-editor/react';
import { getMappingEvent, getMappingValue, createEvent } from '@walkeros/core';
import type { Mapping } from '@walkeros/core';

// Auto-import CSS
import '../../styles/mapping-demo.css';

// NOTE: Monaco Editor configuration (workers, etc.) must be handled by the consuming application.
// See apps/explorer/demo/main.tsx for an example with Vite

/**
 * MappingDemo - Interactive mapping demonstration component
 *
 * Features:
 * - Monaco Editor (VS Code experience)
 * - Real-time mapping transformation preview
 * - JSON formatting and validation
 * - Syntax highlighting and validation
 * - Responsive layout
 *
 * Usage:
 * ```tsx
 * import { MappingDemo } from '@walkeros/explorer';
 *
 * <MappingDemo />
 * ```
 *
 * Monaco Editor loads from CDN by default.
 * To use from npm, configure before importing:
 *
 * ```tsx
 * import { loader } from '@monaco-editor/react';
 * import * as monaco from 'monaco-editor';
 *
 * loader.config({ monaco });
 *
 * // Then import and use
 * import { MappingDemo } from '@walkeros/explorer';
 * ```
 */

interface CodeBoxProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

function CodeBox({ label, value, onChange, disabled = false }: CodeBoxProps) {
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

export function MappingDemo() {
  const [input, setInput] = useState(`{
  "id": "P123",
  "productName": "Laptop",
  "price": 999
}`);

  const [config, setConfig] = useState(`{
  "product": {
    "view": {
      "name": "view_item",
      "data": {
        "map": {
          "item_id": "data.id",
          "item_name": "data.productName",
          "price": "data.price",
          "currency": { "value": "USD" }
        }
      }
    }
  }
}`);

  const [output, setOutput] = useState('');

  const updateOutput = useCallback(async () => {
    try {
      const data = JSON.parse(input);
      const mapping = JSON.parse(config) as Mapping.Rules;

      const event = createEvent({ name: 'product view', data });
      const mappingResult = await getMappingEvent(event, mapping);
      const result = await getMappingValue(
        event,
        mappingResult.eventMapping?.data,
        {
          collector: { id: 'demo' } as any,
        },
      );

      setOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setOutput(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [input, config]);

  useEffect(() => {
    const timeoutId = setTimeout(updateOutput, 500);
    return () => clearTimeout(timeoutId);
  }, [updateOutput]);

  return (
    <div className="elb-explorer-mapping">
      <div className="elb-explorer-mapping-grid">
        <CodeBox label="Event Data" value={input} onChange={setInput} />
        <CodeBox label="Mapping Config" value={config} onChange={setConfig} />
        <CodeBox label="Result" value={output} disabled />
      </div>
    </div>
  );
}
