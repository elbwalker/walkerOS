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
import { LiveCode } from './liveCode';
import { formatValue, parseInput } from '../molecules/codeBox';

interface DestinationPushProps<Settings = unknown, MappingType = unknown>
  extends Omit<LiveCodeProps, 'input' | 'config' | 'fn'> {
  destination: Destination.Instance<Settings, MappingType>;
  event: WalkerOS.PartialEvent;
  mapping?: Mapping.Rule<MappingType> | string;
  settings?: Settings;
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
  };
};

const createGenericInterceptor = (baseEnv: Destination.Environment = {}) => {
  const capturedCalls: string[] = [];

  const formatArgs = (args: unknown[]): string => {
    return args.map((arg) => formatValue(arg, { quotes: true })).join(', ');
  };

  const createProxy = (target: unknown, path = ''): unknown => {
    if (typeof target !== 'object' || target === null) {
      return target;
    }

    return new Proxy(target as Record<string, unknown>, {
      get(obj: Record<string, unknown>, prop: string) {
        const value = obj[prop];

        if (typeof value === 'function') {
          // Intercept function calls - use just the function name, not full path
          return (...args: unknown[]) => {
            capturedCalls.push(`${prop}(${formatArgs(args)});`);

            // Call the original function if it exists
            // if (typeof value === 'function') {
            //   return (value as (...args: unknown[]) => unknown)(...args);
            // }
          };
        }

        if (typeof value === 'object' && value !== null) {
          // Recursively proxy nested objects but keep tracking the function names
          return createProxy(value, path ? `${path}.${prop}` : prop);
        }

        return value;
      },
    });
  };

  const interceptedEnv = createProxy(baseEnv) as Destination.Environment;

  return {
    env: interceptedEnv,
    getCapturedCalls: () => [...capturedCalls],
  };
};

const createDestinationContext = <Settings, MappingType>(
  settings: Settings,
  env: Destination.Environment,
): Destination.Context<Settings, MappingType> => ({
  collector: createMockCollector(),
  config: {
    settings,
    loadScript: false,
  },
  env,
});

const createPushContext = <Settings, MappingType>(
  settings: Settings,
  mapping: Mapping.Rule<MappingType>,
  env: Destination.Environment,
): Destination.PushContext<Settings, MappingType> => ({
  ...createDestinationContext<Settings, MappingType>(settings, env),
  mapping,
});

interface DestinationInitProps<Settings = unknown, MappingType = unknown> {
  destination: Destination.Instance<Settings, MappingType>;
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
        const inputValue = await parseInput(input);

        // Create interceptor based on destination's env
        const { env, getCapturedCalls } = createGenericInterceptor(
          destination.env,
        );

        if (!destination.init) {
          log('No init method found');
          return;
        }

        const context = createDestinationContext<Settings, MappingType>(
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
      labelOutput="Function Calls"
      showQuotes={false}
    />
  );
};

export const DestinationPush = <Settings = unknown, MappingType = unknown>({
  destination,
  event,
  mapping = {},
  settings,
  ...liveCodeProps
}: DestinationPushProps<Settings, MappingType>) => {
  const mappingFn = useCallback(
    async (input: unknown, config: unknown, log: (result: string) => void) => {
      try {
        const inputValue = await parseInput(input);
        const configValue = await parseInput(config);
        const event = createEvent(inputValue);

        // Create interceptor based on destination's env
        const { env, getCapturedCalls } = createGenericInterceptor(
          destination.env,
        );

        // Push the event
        const pushContext = createPushContext<Settings, MappingType>(
          settings,
          configValue,
          env,
        );

        await destination.push(event, pushContext);

        const calls = getCapturedCalls();
        if (calls.length > 0) {
          log(calls.join('\n'));
        } else {
          log('No function calls captured');
        }
      } catch (error) {
        log(`Error: ${error}`);
      }
    },
    [destination],
  );

  return (
    <LiveCode
      input={event}
      config={mapping}
      fn={mappingFn}
      labelInput="Event"
      labelConfig="Mapping"
      labelOutput="Function Calls"
      showQuotes={false}
      {...liveCodeProps}
    />
  );
};
