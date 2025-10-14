import { startFlow } from '../flow';
import type { Source, WalkerOS } from '@walkeros/core';

describe('Source Create Flow Integration', () => {
  it('should initialize complete setup from flow config', async () => {
    const mockPushCalls: WalkerOS.Event[] = [];

    const mockSource: Source.Init = async (config, env) => {
      expect(config).toEqual({
        settings: {
          test: 'value',
        },
      });

      expect(env).toEqual({
        elb: expect.any(Function),
        foo: 'bar',
      });

      return {
        type: 'mock',
        config: {
          settings: config.settings || {},
        },
        push: env!.elb, // Required push method
      };
    };

    const { collector, elb } = await startFlow({
      sources: {
        mockSource: {
          code: mockSource,
          config: {
            settings: {
              test: 'value',
            },
          },
          env: {
            foo: 'bar',
            // elb will be injected by collector
          },
        },
      },
      destinations: {
        test: {
          code: {
            type: 'test',
            config: {},
            push: (event: WalkerOS.Event) => {
              mockPushCalls.push(event);
            },
          },
        },
      },
    });

    expect(collector.sources).toEqual({
      mockSource: {
        type: 'mock',
        config: {
          settings: { test: 'value' },
        },
        push: expect.any(Function), // Sources now include push method
      },
    });

    await elb({ name: 'manual event', data: { test: 'data' } });

    expect(mockPushCalls).toHaveLength(1);
    expect(mockPushCalls[0]).toMatchObject({
      name: 'manual event',
      data: { test: 'data' },
    });
  });
});
