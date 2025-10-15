import React, { useState, useCallback, useEffect } from 'react';
import { getMappingEvent, getMappingValue, createEvent } from '@walkeros/core';
import type { Mapping, WalkerOS } from '@walkeros/core';
import { CodePanel } from '../molecules/code-panel';

// Auto-import CSS
import '../../styles/mapping-demo.css';

export interface MappingCodeProps {
  input: string;
  config?: string;
  labelInput?: string;
  labelOutput?: string;
  theme?: 'light' | 'dark' | 'vs' | 'vs-dark';
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

export function MappingCode({
  input: initialInput,
  config,
  labelInput = 'Configuration',
  labelOutput = 'Result',
  theme = 'light',
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
        <CodePanel
          label={labelInput}
          value={input}
          onChange={setInput}
          language="javascript"
          theme={theme}
        />
        <CodePanel
          label={labelOutput}
          value={output}
          disabled
          language="json"
          theme={theme}
        />
      </div>
    </div>
  );
}
