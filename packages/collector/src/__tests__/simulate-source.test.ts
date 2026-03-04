import { simulateSource } from '../simulate';
import type { Source, WalkerOS } from '@walkeros/core';

describe('simulateSource', () => {
  it('captures events pushed by source on run', async () => {
    const code: Source.Init = (ctx) => ({
      type: 'test',
      config: {},
      push: ctx.env.push as unknown as Source.Push,
      on(event) {
        if (event === 'run') {
          ctx.env.push({ name: 'page view', data: { title: 'Home' } });
        }
      },
    });

    const result = await simulateSource({
      code,
      env: {
        window: globalThis as Window & typeof globalThis,
        document: globalThis.document,
        localStorage: globalThis.localStorage,
      },
    });

    expect(result.capturedEvents).toHaveLength(1);
    expect(result.capturedEvents[0].name).toBe('page view');
    expect(result.collector).toBeDefined();

    // Cleanup
    await result.collector.command('shutdown');
  });

  it('handles setup + trigger pattern', async () => {
    const order: string[] = [];

    const code: Source.Init = (ctx) => ({
      type: 'test',
      config: {},
      push: ctx.env.push as unknown as Source.Push,
      on(event) {
        if (event === 'run') order.push('source-run');
      },
    });

    const setup: Source.SetupFn = (_input, _env) => {
      order.push('setup');
      return () => order.push('trigger');
    };

    const result = await simulateSource({
      code,
      setup,
      input: { test: true },
      env: {
        window: globalThis as Window & typeof globalThis,
        document: globalThis.document,
        localStorage: globalThis.localStorage,
      },
    });

    expect(order).toEqual(['setup', 'source-run', 'trigger']);
    await result.collector.command('shutdown');
  });

  it('returns empty events when source pushes nothing', async () => {
    const code: Source.Init = (ctx) => ({
      type: 'test',
      config: {},
      push: ctx.env.push as unknown as Source.Push,
    });

    const result = await simulateSource({
      code,
      env: {
        window: globalThis as Window & typeof globalThis,
        document: globalThis.document,
        localStorage: globalThis.localStorage,
      },
    });

    expect(result.capturedEvents).toEqual([]);
    await result.collector.command('shutdown');
  });

  it('captures multiple events from source', async () => {
    const code: Source.Init = (ctx) => ({
      type: 'test',
      config: {},
      push: ctx.env.push as unknown as Source.Push,
      on(event) {
        if (event === 'run') {
          ctx.env.push({ name: 'page view', data: { title: 'Home' } });
          ctx.env.push({ name: 'product view', data: { id: '123' } });
        }
      },
    });

    const result = await simulateSource({
      code,
      env: {
        window: globalThis as Window & typeof globalThis,
        document: globalThis.document,
        localStorage: globalThis.localStorage,
      },
    });

    expect(result.capturedEvents).toHaveLength(2);
    expect(result.capturedEvents[0].name).toBe('page view');
    expect(result.capturedEvents[1].name).toBe('product view');
    await result.collector.command('shutdown');
  });
});
