import type {
  Destination,
  Transformer,
  Source,
  Elb,
} from '@walkeros/core';
import { createEvent, createMockLogger } from '@walkeros/core';
import { pushToDestinations, startFlow } from '..';
import type { Collector } from '@walkeros/core';

describe('destination modes (disabled/mock)', () => {
  let mockPush: jest.Mock;
  let mockInit: jest.Mock;

  function createTestCollector(
    destinations: Record<string, Destination.Instance>,
  ): Collector.Instance {
    const mockLogger = createMockLogger();
    const scopedMockLogger = createMockLogger();
    mockLogger.scope = jest.fn().mockReturnValue(scopedMockLogger);

    return {
      allowed: true,
      destinations,
      globals: {},
      hooks: {},
      logger: mockLogger,
      user: {},
      consent: {},
      queue: [],
      pending: { destinations: {}, sources: {}, transformers: {}, stores: {} },
      pendingSources: [],
      transformers: {},
      sources: {},
      status: {
        startedAt: 0,
        in: 0,
        out: 0,
        failed: 0,
        sources: {},
        destinations: {},
      },
      config: {
        tagging: 1,
        globalsStatic: {},
        sessionStatic: {},
      },
    } as unknown as Collector.Instance;
  }

  beforeEach(() => {
    mockPush = jest.fn().mockResolvedValue({ status: 200 });
    mockInit = jest.fn();
  });

  describe('disabled', () => {
    it('should not call destination.push when disabled', async () => {
      const destination: Destination.Instance = {
        push: mockPush,
        init: mockInit,
        config: { disabled: true },
      };

      const collector = createTestCollector({ dest: destination });
      const event = createEvent();

      await pushToDestinations(collector, event);

      expect(mockPush).not.toHaveBeenCalled();
      expect(mockInit).not.toHaveBeenCalled();
    });

    it('should not queue events for disabled destinations', async () => {
      const destination: Destination.Instance = {
        push: mockPush,
        init: mockInit,
        config: { disabled: true },
        queuePush: [],
      };

      const collector = createTestCollector({ dest: destination });
      const event = createEvent();

      await pushToDestinations(collector, event);

      // queuePush should not accumulate events
      expect(destination.queuePush).toHaveLength(0);
    });

    it('should still push to other destinations when one is disabled', async () => {
      const disabledDest: Destination.Instance = {
        push: jest.fn(),
        config: { disabled: true },
      };

      const activeDest: Destination.Instance = {
        push: mockPush,
        config: { init: true },
      };

      const collector = createTestCollector({
        disabled: disabledDest,
        active: activeDest,
      });
      const event = createEvent();

      await pushToDestinations(collector, event);

      expect(disabledDest.push).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('mock', () => {
    it('should return mock value instead of calling destination.push', async () => {
      const mockValue = { status: 200 };

      const { elb } = await startFlow({
        destinations: {
          mocked: {
            code: {
              type: 'mocked',
              config: { mock: mockValue },
              push: mockPush,
            },
          },
        },
      });

      const result = await elb('page view');

      expect(mockPush).not.toHaveBeenCalled();
      expect(result.done?.mocked?.data).toEqual(mockValue);
    });

    it('should handle falsy mock value null', async () => {
      const { elb } = await startFlow({
        destinations: {
          mocked: {
            code: {
              type: 'mocked',
              config: { mock: null },
              push: mockPush,
            },
          },
        },
      });

      const result = await elb('page view');

      expect(mockPush).not.toHaveBeenCalled();
      // mock: null is !== undefined, so it should be returned
      expect(result.done).toBeDefined();
    });

    it('should handle falsy mock value 0', async () => {
      const { elb } = await startFlow({
        destinations: {
          mocked: {
            code: {
              type: 'mocked',
              config: { mock: 0 },
              push: mockPush,
            },
          },
        },
      });

      const result = await elb('page view');

      expect(mockPush).not.toHaveBeenCalled();
      expect(result.done).toBeDefined();
    });

    it('should handle falsy mock value false', async () => {
      const { elb } = await startFlow({
        destinations: {
          mocked: {
            code: {
              type: 'mocked',
              config: { mock: false },
              push: mockPush,
            },
          },
        },
      });

      const result = await elb('page view');

      expect(mockPush).not.toHaveBeenCalled();
      expect(result.done).toBeDefined();
    });

    it('should pass mock value as _response to next chain', async () => {
      let capturedResponse: unknown;

      const { collector } = await startFlow({
        sources: {
          s: {
            code: async (context): Promise<Source.Instance> => ({
              type: 'test',
              config: context.config as Source.Config,
              push: context.env.push as Elb.Fn,
            }),
          },
        },
        transformers: {
          logger: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'logger',
              config: context.config,
              push: async (event, ctx) => {
                capturedResponse = ctx.ingest._response;
                return { event };
              },
            }),
          },
        },
        destinations: {
          mocked: {
            code: {
              type: 'mocked',
              config: { mock: { status: 200 } },
              push: mockPush,
            },
            next: 'logger',
          },
        },
      });

      await collector.sources.s.push({ name: 'page view', data: {} });

      expect(mockPush).not.toHaveBeenCalled();
      expect(capturedResponse).toEqual({ status: 200 });
    });
  });

  describe('batch routing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not use batch path for mocked destinations', async () => {
      const mockPushBatch = jest.fn();

      const { elb } = await startFlow({
        destinations: {
          batchMock: {
            code: {
              type: 'batchMock',
              config: {
                mock: {},
                mapping: {
                  '*': { '*': { batch: 50 } },
                },
              },
              push: mockPush,
              pushBatch: mockPushBatch,
            },
          },
        },
      });

      await elb('page view');
      jest.advanceTimersByTime(100);

      // Neither push nor pushBatch should be called (mock intercepts first)
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockPushBatch).not.toHaveBeenCalled();
    });
  });

  describe('cache', () => {
    it('should not write to cache store for mocked pushes (mock: {})', async () => {
      let pushCount = 0;
      const mockValue = {};

      const { elb } = await startFlow({
        destinations: {
          mocked: {
            code: {
              type: 'mocked',
              config: { mock: mockValue },
              push: async () => {
                pushCount++;
              },
            },
            cache: {
              rules: [{ match: '*', key: ['event.name'], ttl: 60 }],
            },
          },
        },
      });

      // Push same event twice while mocked
      await elb({ name: 'page view', data: {} });
      await elb({ name: 'page view', data: {} });

      // Push should never have been called (mocked)
      expect(pushCount).toBe(0);

      // The mock value should be returned each time (no cache interference)
      const result = await elb({ name: 'page view', data: {} });
      expect(result.done?.mocked?.data).toEqual(mockValue);
    });

    it('should not write to cache store for mocked pushes', async () => {
      let pushCount = 0;
      const mockValue = { mocked: true };

      // Use startFlow to set up a destination with mock + cache
      const { elb, collector } = await startFlow({
        destinations: {
          mocked: {
            code: {
              type: 'mocked',
              config: { mock: mockValue },
              push: async () => {
                pushCount++;
              },
            },
            cache: {
              rules: [{ match: '*', key: ['event.name'], ttl: 60 }],
            },
          },
        },
      });

      // Push same event twice while mocked
      await elb({ name: 'page view', data: {} });
      await elb({ name: 'page view', data: {} });

      // Push should never have been called (mocked)
      expect(pushCount).toBe(0);

      // The mock value should be returned each time (no cache interference)
      const result = await elb({ name: 'page view', data: {} });
      expect(result.done?.mocked?.data).toEqual(mockValue);
    });
  });
});
