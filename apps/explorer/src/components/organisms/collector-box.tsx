import React, { useState, useEffect, type ComponentType } from 'react';
import { Editor } from '@monaco-editor/react';
import { startFlow } from '@walkeros/collector';
import { Box } from '../atoms/box';
import type { DestinationCode } from '../../helpers/destinations';
import { registerPalenightTheme } from '../../themes/palenight';

export interface CollectorBoxProps {
  event: string;
  mapping: string;
  destination: DestinationCode;
  label?: string;
}

/**
 * CollectorBox - Runs a collector with destination to transform events
 *
 * Takes raw event and mapping config, processes through collector pipeline,
 * and displays the formatted destination output.
 *
 * @example
 * <CollectorBox
 *   event={JSON.stringify(event)}
 *   mapping={mappingConfig}
 *   destination={createGtagDestination()}
 *   label="Result"
 * />
 */
export function CollectorBox({
  event,
  mapping,
  destination,
  label = 'Result',
}: CollectorBoxProps) {
  const [output, setOutput] = useState(
    '// Click elements in the preview to see function call',
  );
  const [monacoTheme, setMonacoTheme] = useState('vs-light');

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

  useEffect(() => {
    (async () => {
      try {
        // Parse inputs
        const eventObj = JSON.parse(event);
        const mappingObj = JSON.parse(mapping);

        // Create collector with destination
        const { collector } = await startFlow({
          destinations: {
            demo: {
              code: destination,
              config: {
                mapping: mappingObj,
              },
              env: {
                elb: setOutput,
              },
            },
          },
        });

        // Push event through collector → destination
        await collector.push(eventObj);
      } catch (error) {
        if (error instanceof Error) {
          setOutput(`// Error: ${error.message}`);
        } else {
          setOutput(`// Error: ${String(error)}`);
        }
      }
    })();
  }, [event, mapping, destination]);

  const handleBeforeMount = (monaco: typeof import('monaco-editor')) => {
    registerPalenightTheme(monaco);
  };

  const MonacoEditor = Editor as ComponentType<{
    height: string;
    language: string;
    value: string;
    onChange: (value: string | undefined) => void;
    beforeMount?: (monaco: typeof import('monaco-editor')) => void;
    theme: string;
    options: Record<string, unknown>;
  }>;

  return (
    <Box header={label}>
      <MonacoEditor
        height="100%"
        language="javascript"
        value={output}
        onChange={() => {}}
        beforeMount={handleBeforeMount}
        theme={monacoTheme}
        options={{
          readOnly: true,
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
