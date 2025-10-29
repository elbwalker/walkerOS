import type {
  WalkerOS,
  Mapping,
  Destination,
  Collector,
  Elb,
} from '@walkeros/core';
import type { LiveCodeProps } from './liveCode';
import React, { useCallback } from 'react';
import { createEvent, tryCatchAsync } from '@walkeros/core';
import { destinationPush } from '@walkeros/collector';
import { LiveCode } from './liveCode';
import { formatValue, parseInput } from '../molecules/codeBox';

interface DestinationPushProps<Settings = unknown, MappingType = unknown>
  extends Omit<LiveCodeProps, 'input' | 'config' | 'fn'> {
  destination: Destination.Instance;
  event: WalkerOS.PartialEvent;
  mapping?: Mapping.Rule<MappingType> | string;
  settings?: Settings;
  generic?: boolean; // When true, wraps mapping in '*': { '*': mapping }
}

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
    command: () => Promise.resolve(mockPushResult),
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

const createSelectiveInterceptor = (
  baseEnv: Record<string, unknown> = {},
  simulationPaths: string[] = ['call:*'],
) => {
  const capturedCalls: string[] = [];

  const formatArgs = (args: unknown[]): string => {
    return args.map((arg) => formatValue(arg, { quotes: true })).join(', ');
  };

  const shouldIntercept = (path: string[]): boolean => {
    const fullPath = path.join('.');

    // Check if any simulation path matches
    return simulationPaths.some((pattern) => {
      if (pattern === 'call:*') return true; // Intercept all function calls
      if (pattern.startsWith('call:')) {
        const targetPath = pattern.slice(5); // Remove 'call:' prefix
        return fullPath === targetPath || fullPath.endsWith('.' + targetPath);
      }
      return false;
    });
  };

  const interceptFunction = (path: string[], originalFn?: Function) => {
    return (...args: unknown[]) => {
      if (shouldIntercept(path)) {
        const functionName = path[path.length - 1];
        capturedCalls.push(`${functionName}(${formatArgs(args)});`);
      }
      return originalFn?.(...args);
    };
  };

  const createProxy = (target: unknown, path: string[] = []): unknown => {
    if (typeof target !== 'object' || target === null) {
      return target;
    }

    return new Proxy(target as Record<string, unknown>, {
      get(obj: Record<string, unknown>, prop: string) {
        const value = obj[prop];
        const currentPath = [...path, prop];

        if (typeof value === 'function') {
          return interceptFunction(currentPath, value);
        }

        if (typeof value === 'object' && value !== null) {
          return createProxy(value, currentPath);
        }

        return value;
      },
    });
  };

  const interceptedEnv = createProxy(baseEnv) as Record<string, unknown>;

  return {
    env: interceptedEnv,
    getCapturedCalls: () => capturedCalls,
  };
};

const createContext = <Settings, MappingType>(
  settings: Settings,
  env: Record<string, unknown>,
  mapping?: Mapping.Rule<MappingType>,
) => ({
  collector: createMockCollector(),
  config: {
    settings,
    loadScript: false,
  },
  env,
  ...(mapping && { mapping }),
});

interface DestinationInitProps<Settings = unknown, MappingType = unknown> {
  destination: Destination.Instance;
  custom?: unknown;
}

export const DestinationInit = <Settings = unknown, MappingType = unknown>({
  destination,
  custom = {},
}: DestinationInitProps<Settings, MappingType>) => {
  const input = formatValue(custom);

  const mappingFn = async (
    input: unknown,
    _config: unknown,
    log: (result: string) => void,
  ) => {
    await tryCatchAsync(
      async () => {
        if (!destination.init) {
          log('No init method found');
          return;
        }

        const inputValue = await parseInput(input);

        // Get destination's exported environment and simulation paths
        const destinationEnv =
          (destination as any).examples?.env?.push || destination.env || {};
        const simulationPaths = (destination as any).examples?.simulation || [
          'call:*',
        ];

        // Create selective interceptor based on destination's env and simulation paths
        const { env, getCapturedCalls } = createSelectiveInterceptor(
          destinationEnv,
          simulationPaths,
        );

        const context = createContext<Settings, MappingType>(
          inputValue as Settings,
          env,
        );

        await destination.init(context);

        const calls = getCapturedCalls();
        if (calls.length > 0) {
          log(calls.join('\n'));
        } else {
          log('Destination initialized successfully');
        }
      },
      (error) => log(`Error: ${error}`),
    )();
  };

  return (
    <LiveCode
      input={input}
      fn={mappingFn}
      labelInput="Settings"
      labelOutput="Result"
      showQuotes={false}
    />
  );
};

export const DestinationPush = <Settings = unknown, MappingType = unknown>({
  destination,
  event,
  mapping = {},
  settings,
  generic = false,
  ...liveCodeProps
}: DestinationPushProps<Settings, MappingType>) => {
  const mappingFn = useCallback(
    async (input: unknown, config: unknown, log: (result: string) => void) => {
      await tryCatchAsync(
        async () => {
          const inputValue = await parseInput(input);
          const configValue = await parseInput(config);
          const event = createEvent(inputValue);

          // Wrap mapping in generic structure if requested
          const wrappedMapping =
            generic && configValue
              ? { '*': { '*': configValue } }
              : configValue;

          // Get destination's exported environment and simulation paths
          const destinationEnv =
            (destination as any).examples?.env?.push || destination.env || {};
          const simulationPaths = (destination as any).examples?.simulation || [
            'call:*',
          ];

          // Create selective interceptor based on destination's env and simulation paths
          const { env, getCapturedCalls } = createSelectiveInterceptor(
            destinationEnv,
            simulationPaths,
          );

          // Configure destination with mapping and use collector's destinationPush
          const configuredDestination = {
            ...destination,
            config: {
              ...destination.config,
              settings: settings || ({} as Settings),
              mapping: wrappedMapping as any,
            },
            env,
          };

          // Create mock collector for the mapping
          const mockCollector = createMockCollector();

          // Use collector's destinationPush to apply mapping transformations
          await destinationPush(mockCollector, configuredDestination, event);

          const calls = getCapturedCalls();
          if (calls.length > 0) {
            log(calls.join('\n'));
          } else {
            log('No function calls captured');
          }
        },
        (error) => log(`Error: ${error}`),
      )();
    },
    [destination, settings, generic],
  );

  return (
    <LiveCode
      input={event}
      config={mapping}
      fn={mappingFn}
      labelInput="Event"
      labelConfig="Mapping"
      labelOutput="Result"
      showQuotes={false}
      {...liveCodeProps}
    />
  );
};
