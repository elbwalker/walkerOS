import { startFlow } from '../flow';
import type { Source, WalkerOS, Elb } from '@walkeros/core';

describe('Source Start Flow Integration', () => {
  it('should return collector.push as elb by default', async () => {
    const mockSource: Source.Init = async (config, env) => ({
      type: 'mock',
      config: { settings: config.settings || {} },
      push: env!.elb,
    });

    const { collector, elb } = await startFlow({
      sources: {
        mockSource: {
          code: mockSource,
        },
      },
      run: false,
    });

    // elb should be collector.push by default
    expect(elb).toBe(collector.push);
  });

  it('should return primary source push as elb when marked', async () => {
    const customPush: Elb.Fn = async () => ({
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    });

    const mockSource: Source.Init = async () => ({
      type: 'mock',
      config: {},
      push: customPush,
    });

    const { collector, elb } = await startFlow({
      sources: {
        mockSource: {
          code: mockSource,
          primary: true, // Mark as primary
        },
      },
      run: false,
    });

    // elb should be the source's push method
    expect(elb).toBe(customPush);
    expect(elb).not.toBe(collector.push);

    // Verify primary flag is stored in source config
    expect(collector.sources.mockSource.config.primary).toBe(true);
  });

  it('should use first primary source when multiple are marked', async () => {
    const firstPush: Elb.Fn = async () => ({
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    });

    const secondPush: Elb.Fn = async () => ({
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    });

    const mockSource1: Source.Init = async () => ({
      type: 'mock1',
      config: {},
      push: firstPush,
    });

    const mockSource2: Source.Init = async () => ({
      type: 'mock2',
      config: {},
      push: secondPush,
    });

    const { elb } = await startFlow({
      sources: {
        first: {
          code: mockSource1,
          primary: true,
        },
        second: {
          code: mockSource2,
          primary: true,
        },
      },
      run: false,
    });

    // Should use the first primary source
    expect(elb).toBe(firstPush);
  });

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
