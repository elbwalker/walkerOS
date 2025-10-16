import React, { useState, useEffect } from 'react';
import type { Destination } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { Box } from '../atoms/box';
import { CodeEditor } from './code-editor';

export interface CollectorBoxProps {
  event: string;
  mapping: string;
  destination: Destination.Code;
  label?: string;
  theme?: 'light' | 'dark';
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
  theme = 'light',
}: CollectorBoxProps) {
  const [output, setOutput] = useState(
    '// Click elements in the preview to see function call',
  );

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

  return (
    <Box header={label}>
      <CodeEditor value={output} disabled language="javascript" theme={theme} />
    </Box>
  );
}
