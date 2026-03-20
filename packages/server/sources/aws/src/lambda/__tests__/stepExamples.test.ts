import type { Destination, WalkerOS } from '@walkeros/core';
import { sourceLambda } from '../index';
import { examples } from '../../dev';
import type { Content } from '../examples/trigger';

describe('Step Examples', () => {
  let shutdown: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (shutdown) await shutdown();
    shutdown = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const content = example.in as Content;
    const expected = example.out as {
      name: string;
      data?: Record<string, unknown>;
      entity?: string;
      action?: string;
    };

    // Spy destination captures events after full collector processing
    const events: WalkerOS.Event[] = [];
    const spyDestination: Destination.Instance = {
      type: 'spy',
      config: { init: true },
      push: jest.fn((event: WalkerOS.Event) => {
        events.push(JSON.parse(JSON.stringify(event)));
      }),
    };

    // GET pixel tracking sends shorthand params (e, d) that need
    // a source-level policy to map into proper event fields.
    const input = content as Record<string, unknown>;
    const rc = (input.requestContext as Record<string, unknown>) || {};
    const http = (rc.http as Record<string, unknown>) || {};
    const isGet =
      http.method === 'GET' ||
      (input as { httpMethod?: string }).httpMethod === 'GET';

    const sourcePolicy = isGet
      ? {
          name: { key: 'e' },
          data: {
            fn: (event: unknown) => {
              const e = event as Record<string, unknown>;
              if (typeof e.d === 'string') {
                try {
                  return JSON.parse(e.d);
                } catch {
                  return {};
                }
              }
              return e.d || {};
            },
          },
        }
      : undefined;

    const instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        lambda: {
          code: sourceLambda,
          config: {
            settings: { enablePixelTracking: true },
            ...(sourcePolicy ? { policy: sourcePolicy } : {}),
          },
        },
      },
      destinations: {
        spy: { code: spyDestination },
      },
    });

    // Register shutdown for cleanup
    shutdown = async () => {
      if (instance.flow) await instance.flow.collector.command('shutdown');
    };

    const result = await instance.trigger()(content);

    // HTTP response should be 200
    expect(result.statusCode).toBe(200);

    // Events should be captured by spy destination
    const found = events.find((e) => e.name === expected.name);
    expect(found).toBeDefined();

    if (expected.data) {
      expect(found!.data).toEqual(expect.objectContaining(expected.data));
    }
    if (expected.entity) {
      expect(found!.entity).toBe(expected.entity);
    }
    if (expected.action) {
      expect(found!.action).toBe(expected.action);
    }
  });
});
