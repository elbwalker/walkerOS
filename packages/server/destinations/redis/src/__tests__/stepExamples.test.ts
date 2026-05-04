jest.mock('ioredis', () => ({
  __esModule: true,
  default: class {
    constructor(_urlOrOptions: unknown) {}
    xadd() {
      return Promise.resolve('1700000100000-0');
    }
    pipeline() {
      return {
        xadd: () => this,
        exec: () => Promise.resolve([]),
      };
    }
    quit() {
      return Promise.resolve('OK');
    }
    on() {
      return this;
    }
  },
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type {
  Env,
  RedisClientConstructor,
  RedisClientMock,
  RedisPipelineMock,
  Settings,
  XaddArg,
} from '../types';

type CallRecord = [string, ...unknown[]];
type ExpectedOut = CallRecord | CallRecord[];

function flatten(out: unknown): CallRecord[] {
  if (!Array.isArray(out) || out.length === 0) return [];
  // Single call: ['client.xadd', args]
  if (typeof out[0] === 'string') return [out as CallRecord];
  // Multiple calls: [['client.xadd', args], ...]
  return out as CallRecord[];
}

/**
 * Recording Env -- wraps a mock ioredis constructor whose xadd appends to a
 * shared call log as ['client.xadd', XaddArg[]].
 */
function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];

  class RecordingRedis implements RedisClientMock {
    constructor(_urlOrOptions: unknown) {}
    async xadd(...args: XaddArg[]): Promise<string | null> {
      calls.push(['client.xadd', args]);
      return '1700000100000-0';
    }
    pipeline(): RedisPipelineMock {
      const pipeArgs: XaddArg[][] = [];
      const pipe: RedisPipelineMock = {
        xadd: (...args: XaddArg[]) => {
          pipeArgs.push(args);
          return pipe;
        },
        exec: async () => {
          for (const args of pipeArgs) {
            calls.push(['client.xadd', args]);
          }
          return pipeArgs.map(() => [null, '1700000100000-0']);
        },
      };
      return pipe;
    }
    async quit(): Promise<string> {
      return 'OK';
    }
  }

  const Constructor: RedisClientConstructor = RecordingRedis;

  return {
    env: {
      Redis: {
        Client: Constructor,
      },
    },
    collected: () => calls,
  };
}

/**
 * Normalize xadd args. The JSON-serialized event field value is always
 * validated as parseable JSON, then replaced with a placeholder tag for
 * comparison against the example's `json:event` marker.
 */
function normalize(args: unknown): unknown {
  if (!Array.isArray(args)) return args;
  // Replace any string that looks like JSON event with placeholder
  return args.map((arg) => {
    if (typeof arg !== 'string') return arg;
    // Try parse - if it parses to object, treat as event JSON
    if (arg.startsWith('{') && arg.endsWith('}')) {
      try {
        const parsed = JSON.parse(arg);
        if (parsed && typeof parsed === 'object') return 'json:event';
      } catch {
        // not JSON
      }
    }
    return arg;
  });
}

describe('redis server destination -- step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: unknown;
      settings?: Partial<Settings>;
    };

    const { env, collected } = spyEnv();
    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    const exampleRedis = example.settings?.redis;
    const baseSettings: Settings = {
      redis: {
        streamKey: 'walkeros:events',
        ...(exampleRedis ?? {}),
      },
    };

    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: baseSettings,
        mapping: mappingConfig,
      },
    );

    await elb(event);

    // Let the async push settle.
    await new Promise((resolve) => setImmediate(resolve));

    const expected = flatten(example.out as ExpectedOut);
    const actual = collected();

    expect(actual.map((c) => [c[0], normalize(c[1])])).toEqual(expected);
  });
});
