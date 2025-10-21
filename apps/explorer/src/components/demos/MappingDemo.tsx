import React, { useState, useCallback, useEffect } from 'react';
import { CodeBox } from '../organisms/code-box';
import { Grid } from '../atoms/grid';

// NOTE: Monaco Editor configuration (workers, etc.) must be handled by the consuming application.
// See apps/explorer/demo/main.tsx for an example with Vite

export interface MappingDemoProps {
  input?: string;
  config?: string;
  labelInput?: string;
  labelConfig?: string;
  labelOutput?: string;
  fn?: (input: string, config: string) => Promise<string>;
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

export function MappingDemo({
  input: initialInput = '{}',
  config: initialConfig = '{}',
  labelInput = 'Input',
  labelConfig = 'Config',
  labelOutput = 'Output',
  fn,
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
    <Grid columns={3}>
      <CodeBox
        label={labelInput}
        code={input}
        onChange={setInput}
        language="json"
        showFormat
      />
      <CodeBox
        label={labelConfig}
        code={config}
        onChange={setConfig}
        language="json"
        showFormat
      />
      <CodeBox label={labelOutput} code={output} disabled language="json" />
    </Grid>
  );
}
