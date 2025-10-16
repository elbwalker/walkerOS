import React, { useState, useCallback, useEffect } from 'react';
import type { WalkerOS, Mapping, Destination } from '@walkeros/core';
import {
  createEvent,
  tryCatchAsync,
  processEventMapping,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { CodePanel } from '../organisms/code-panel';

// Auto-import CSS
import '../../styles/mapping-demo.css';

export interface DestinationDemoProps {
  destination: Destination.Instance;
  event: WalkerOS.PartialEvent;
  mapping?: Mapping.Rule | string;
  settings?: unknown;
  generic?: boolean; // When true, wraps mapping in '*': { '*': mapping }
  labelEvent?: string;
  labelMapping?: string;
  labelOutput?: string;
  theme?: 'light' | 'dark';
  fn?: (
    event: WalkerOS.Event,
    context: Destination.PushContext,
  ) => Promise<string>; // Custom output function
}

/**
 * DestinationDemo - Interactive destination testing component
 *
 * Simple, generic component that calls destination.push() and captures output.
 * The website provides the destination with a mock env that logs function calls.
 *
 * Props:
 * - destination: Destination instance (website provides with mock env)
 * - event: walkerOS event to process
 * - mapping: Optional mapping rules
 * - settings: Destination-specific settings
 * - generic: If true, wraps mapping in { '*': { '*': mapping } }
 * - fnName: Function name to capture (optional, for generic logging)
 * - theme: Light or dark theme
 *
 * Example:
 * ```tsx
 * // Website creates destination with capture function
 * const destination = {
 *   ...destinationPlausible,
 *   env: {
 *     window: {
 *       plausible: (...args) => {
 *         // Capture and format args
 *       }
 *     }
 *   }
 * };
 *
 * <DestinationDemo
 *   destination={destination}
 *   event={getEvent('order complete')}
 *   mapping={examples.mapping.purchase}
 *   settings={{ domain: 'elbwalker.com' }}
 *   generic={true}
 *   fnName="plausible"
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
  generic = false,
  labelEvent = 'Event',
  labelMapping = 'Mapping',
  labelOutput = 'Result',
  theme = 'light',
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
        };

        // Create minimal collector for mapping processing
        const { collector } = await startFlow({});

        // Process event mapping (applies mapping transformations)
        const processed = await processEventMapping(event, config, collector);

        // Build context for destination.push()
        const context: Destination.PushContext = {
          collector,
          config,
          data: processed.data,
          mapping: processed.mapping,
          env: destination.env || {},
        };

        // If custom function provided, use it to capture output
        if (fn) {
          const result = await fn(processed.event, context);
          setOutput(result);
        } else {
          // Otherwise just call destination.push()
          await destination.push(processed.event, context);
          setOutput('Function called (output captured by mock env)');
        }
      },
      (error) => setOutput(`Error: ${error}`),
    )();
  }, [eventInput, mappingInput, destination, settings, generic, fn]);

  useEffect(() => {
    const timeoutId = setTimeout(executeDestination, 500);
    return () => clearTimeout(timeoutId);
  }, [executeDestination]);

  return (
    <div className="elb-explorer">
      <div className="elb-explorer-grid">
        <CodePanel
          label={labelEvent}
          value={eventInput}
          onChange={setEventInput}
          language="json"
          theme={theme}
        />
        <CodePanel
          label={labelMapping}
          value={mappingInput}
          onChange={setMappingInput}
          language="json"
          theme={theme}
        />
        <CodePanel
          label={labelOutput}
          value={output}
          disabled
          language="javascript"
          theme={theme}
        />
      </div>
    </div>
  );
}
