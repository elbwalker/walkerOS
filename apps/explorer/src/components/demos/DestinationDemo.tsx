import React, { useState, useCallback, useEffect } from 'react';
import type { WalkerOS, Mapping, Destination } from '@walkeros/core';
import { createIngest } from '@walkeros/core';
import {
  createEvent,
  tryCatchAsync,
  processEventMapping,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { CodeBox } from '../molecules/code-box';
import { Grid } from '../atoms/grid';
import {
  captureDestinationPush,
  formatCapturedCalls,
} from '../../helpers/capture';

export interface DestinationDemoProps {
  destination: Destination.Instance;
  event: WalkerOS.PartialEvent;
  mapping?: Mapping.Rule | string;
  settings?: unknown;
  include?: string[]; // Passed as config.include for data enrichment
  generic?: boolean; // When true, wraps mapping in '*': { '*': mapping }
  initFirst?: boolean; // When true, calls destination.init() before push()
  labelEvent?: string;
  labelMapping?: string;
  labelOutput?: string;
  fn?: (
    event: WalkerOS.Event,
    context: Destination.PushContext,
  ) => Promise<string>; // Custom output function
}

/**
 * DestinationDemo - Interactive destination testing component
 *
 * Automatically captures destination.push() calls and displays the output.
 * The component auto-detects the destination's env from destination.examples.env.push.
 *
 * Props:
 * - destination: Destination instance with examples.env.push export
 * - event: walkerOS event to process
 * - mapping: Optional mapping rules
 * - settings: Destination-specific settings
 * - generic: If true, wraps mapping in { '*': { '*': mapping } }
 * - labelEvent: Label for event panel (default: 'Event')
 * - labelMapping: Label for mapping panel (default: 'Mapping')
 * - labelOutput: Label for output panel (default: 'Result')
 *
 * Example:
 * ```tsx
 * import destinationPlausible from '@walkeros/web-destination-plausible';
 * import { examples } from '@walkeros/web-destination-plausible';
 * import { getEvent } from '@walkeros/core';
 *
 * const destination = { ...destinationPlausible, examples };
 *
 * <DestinationDemo
 *   destination={destination}
 *   event={getEvent('order complete')}
 *   mapping={examples.mapping.purchase}
 *   settings={{ domain: 'elbwalker.com' }}
 *   generic={true}
 * />
 * ```
 */

// Generic capture function creator
export function createCaptureFn(
  fnName: string,
  onCapture: (output: string) => void,
) {
  return (...args: unknown[]) => {
    const formattedArgs = args
      .map((arg) => {
        if (typeof arg === 'string') return `"${arg}"`;
        return JSON.stringify(arg, null, 2);
      })
      .join(', ');

    onCapture(`${fnName}(${formattedArgs});`);
  };
}

export function DestinationDemo({
  destination,
  event: initialEvent,
  mapping: initialMapping = {},
  settings,
  include,
  generic = false,
  initFirst = false,
  labelEvent = 'Event',
  labelMapping = 'Mapping',
  labelOutput = 'Result',
  fn,
}: DestinationDemoProps) {
  const [eventInput, setEventInput] = useState(
    JSON.stringify(initialEvent, null, 2),
  );
  const [mappingInput, setMappingInput] = useState(
    typeof initialMapping === 'string'
      ? initialMapping
      : JSON.stringify(initialMapping, null, 2),
  );
  const [output, setOutput] = useState('');

  const executeDestination = useCallback(async () => {
    await tryCatchAsync(
      async () => {
        const eventData = JSON.parse(eventInput);
        const mappingData = JSON.parse(mappingInput);
        const event = createEvent(eventData);

        // Wrap mapping in generic structure if requested
        const wrappedMapping =
          generic && mappingData ? { '*': { '*': mappingData } } : mappingData;

        // Build config
        const config: Destination.Config = {
          settings: settings || {},
          mapping: wrappedMapping,
          ...(include && { include }),
        };

        // Create minimal collector for mapping processing
        const { collector } = await startFlow({});

        // Process event mapping (applies mapping transformations)
        const processed = await processEventMapping(event, config, collector);

        // Build context for destination.push()
        const context: Destination.PushContext = {
          id: 'demo',
          collector,
          ingest: createIngest('demo'),
          config,
          data: processed.data,
          rule: processed.mapping,
          env: destination.env || {},
          logger: collector.logger,
        };

        // If custom function provided, use it
        if (fn) {
          const result = await fn(processed.event, context);
          setOutput(result);
          return;
        }

        // Auto-detect destination.examples.env.push (for push method)
        const destinationEnv = (
          destination as {
            examples?: { env?: { push?: Destination.BaseEnv } };
          }
        ).examples?.env?.push;

        // For initFirst destinations (e.g. Snowplow), run init with the push
        // env so the tracker is created, then patch the adapter to intercept
        // calls before push runs.
        if (initFirst && destination.init && destinationEnv) {
          const updatedConfig = await destination.init({
            ...context,
            env: destinationEnv,
          });
          if (updatedConfig && typeof updatedConfig === 'object') {
            context.config = { ...context.config, ...updatedConfig };
          }

          // Patch the adapter stored in _state to intercept push calls
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const adapter = (context.config?.settings as any)?._state?.adapter;
          const calls: Array<{ path: string[]; args: unknown[] }> = [];
          if (adapter) {
            for (const key of Object.keys(adapter)) {
              const original = adapter[key];
              if (typeof original === 'function') {
                adapter[key] = (...args: unknown[]) => {
                  calls.push({ path: [key], args });
                  return original(...args);
                };
              }
            }
          }

          await destination.push(processed.event, {
            ...context,
            env: destinationEnv,
          });

          setOutput(formatCapturedCalls(calls));
          return;
        }

        // Use captureDestinationPush to automatically capture output
        const captureFn = captureDestinationPush(destination, destinationEnv);
        const result = await captureFn(processed.event, context);
        setOutput(result);
      },
      (error) => setOutput(`Error: ${error}`),
    )();
  }, [eventInput, mappingInput, destination, settings, generic, fn]);

  useEffect(() => {
    const timeoutId = setTimeout(executeDestination, 500);
    return () => clearTimeout(timeoutId);
  }, [executeDestination]);

  return (
    <Grid columns={3} rowHeight="synced">
      <CodeBox
        label={labelEvent}
        code={eventInput}
        onChange={setEventInput}
        language="json"
        showFormat
        autoHeight
      />
      <CodeBox
        label={labelMapping}
        code={mappingInput}
        onChange={setMappingInput}
        language="json"
        showFormat
        autoHeight
      />
      <CodeBox
        label={labelOutput}
        code={output}
        disabled
        language="javascript"
        autoHeight
      />
    </Grid>
  );
}
