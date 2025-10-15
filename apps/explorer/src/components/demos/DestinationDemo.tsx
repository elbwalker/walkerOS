import React, { useState, useCallback, useEffect } from 'react';
import type {
  WalkerOS,
  Mapping,
  Destination,
  Collector,
  Elb,
} from '@walkeros/core';
import { createEvent, tryCatchAsync } from '@walkeros/core';
import { destinationPush } from '@walkeros/collector';
import { CodePanel } from '../molecules/code-panel';

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
}

/**
 * DestinationDemo - Interactive destination testing component
 *
 * Tests destination integration by intercepting function calls and showing output.
 * Uses the same pattern as website's DestinationPush but with Monaco Editor.
 *
 * Props:
 * - destination: Destination instance to test
 * - event: walkerOS event to process
 * - mapping: Optional mapping rules (can be wrapped generically)
 * - settings: Destination-specific settings
 * - generic: If true, wraps mapping in { '*': { '*': mapping } }
 * - theme: Light or dark theme
 *
 * Example:
 * ```tsx
 * <DestinationDemo
 *   destination={destinationPlausible}
 *   event={getEvent('order complete')}
 *   mapping={examples.mapping.purchase}
 *   settings={{ domain: 'elbwalker.com' }}
 *   generic={true}
 *   theme="light"
 * />
 * ```
 */

// Create minimal mock collector
const createMockCollector = (): Collector.Instance => {
  const mockPushResult: Elb.PushResult = {
    successful: [],
    queued: [],
    failed: [],
    event: undefined,
    ok: true,
  };

  return {
    push: () => Promise.resolve(mockPushResult),
    allowed: true,
    config: {
      tagging: 0,
      globalsStatic: {},
      sessionStatic: {},
      verbose: false,
    },
    consent: {},
    count: 0,
    custom: {},
    sources: {},
    destinations: {},
    globals: {},
    group: 'demo',
    hooks: {},
    on: {},
    queue: [],
    round: 1,
    session: undefined,
    timing: Date.now(),
    user: {},
    version: '1.0.0',
  } satisfies Collector.Instance;
};

// Generic interceptor to capture function calls
const createGenericInterceptor = (baseEnv: Destination.Environment = {}) => {
  const capturedCalls: string[] = [];

  const formatArgs = (args: unknown[]): string => {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return `"${arg}"`;
        return JSON.stringify(arg, null, 2);
      })
      .join(', ');
  };

  const interceptFunction = (name: string, originalFn?: Function) => {
    return (...args: unknown[]) => {
      capturedCalls.push(`${name}(${formatArgs(args)});`);
      return originalFn?.(...args);
    };
  };

  const createProxy = (target: unknown): unknown => {
    if (typeof target !== 'object' || target === null) {
      return target;
    }

    return new Proxy(target as Record<string, unknown>, {
      get(obj: Record<string, unknown>, prop: string) {
        const value = obj[prop];

        if (typeof value === 'function') {
          return interceptFunction(prop, value);
        }

        if (typeof value === 'object' && value !== null) {
          return createProxy(value);
        }

        return value;
      },
    });
  };

  const interceptedEnv = createProxy(baseEnv) as Destination.Environment;

  return {
    env: interceptedEnv,
    getCapturedCalls: () => capturedCalls,
  };
};

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

        // Create interceptor based on destination's env
        const { env, getCapturedCalls } = createGenericInterceptor(
          destination.env,
        );

        // Configure destination with mapping
        const configuredDestination = {
          ...destination,
          config: {
            settings: settings || {},
            mapping: wrappedMapping,
          },
          env,
        };

        // Create mock collector
        const mockCollector = createMockCollector();

        // Use collector's destinationPush to apply mapping transformations
        await destinationPush(mockCollector, configuredDestination, event);

        const calls = getCapturedCalls();
        if (calls.length > 0) {
          setOutput(calls.join('\n'));
        } else {
          setOutput('No function calls captured');
        }
      },
      (error) => setOutput(`Error: ${error}`),
    )();
  }, [eventInput, mappingInput, destination, settings, generic]);

  useEffect(() => {
    const timeoutId = setTimeout(executeDestination, 500);
    return () => clearTimeout(timeoutId);
  }, [executeDestination]);

  return (
    <div className="elb-explorer-mapping">
      <div className="elb-explorer-mapping-grid">
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
