import { transformerRouter } from '../transformer';
import { createMockLogger } from '@walkeros/core';
import type { Transformer, Collector } from '@walkeros/core';
import type { RouterSettings } from '../types';
function createMockContext(
  settings: any,
): Transformer.Context<Transformer.Types<Partial<RouterSettings>>> {
  return {
    collector: {} as Collector.Instance,
    logger: createMockLogger(),
    id: 'router',
    config: { settings, init: true },
    env: {},
  };
}

describe('transformerRouter', () => {
  it('should route based on ingest path prefix', () => {
    const instance = transformerRouter(
      createMockContext({
        routes: [
          {
            match: { key: 'path', operator: 'prefix', value: '/gtag' },
            next: 'gtag-parser',
          },
          { match: '*', next: 'passthrough' },
        ],
      }),
    ) as Transformer.Instance;

    const result = instance.push(
      {},
      {
        ...createMockContext({}),
        ingest: { path: '/gtag/collect', method: 'GET' },
      },
    );

    expect(result).toEqual({
      next: 'gtag-parser',
    });
  });

  it('should match wildcard as fallback', () => {
    const instance = transformerRouter(
      createMockContext({
        routes: [
          {
            match: { key: 'path', operator: 'prefix', value: '/gtag' },
            next: 'gtag-parser',
          },
          { match: '*', next: ['validator'] },
        ],
      }),
    ) as Transformer.Instance;

    const result = instance.push(
      {},
      {
        ...createMockContext({}),
        ingest: { path: '/collect', method: 'POST' },
      },
    );

    expect(result).toEqual({
      next: ['validator'],
    });
  });

  it('should preserve event when branching (not reset to {})', () => {
    const instance = transformerRouter(
      createMockContext({
        routes: [{ match: '*', next: 'parser' }],
      }),
    ) as Transformer.Instance;

    const result = instance.push({ v: '2', en: 'purchase' } as any, {
      ...createMockContext({}),
      ingest: { path: '/gtag' },
    });

    // Router returns only next, event is preserved by the chain runner
    expect(result).toEqual({ next: 'parser' });
  });

  it('should passthrough when no routes match and no wildcard', () => {
    const instance = transformerRouter(
      createMockContext({
        routes: [
          {
            match: { key: 'path', operator: 'eq', value: '/specific' },
            next: 'parser',
          },
        ],
      }),
    ) as Transformer.Instance;

    const result = instance.push(
      { name: 'test action' },
      { ...createMockContext({}), ingest: { path: '/other' } },
    );

    // No match, no wildcard → passthrough (return undefined/void)
    expect(result).toBeUndefined();
  });

  it('should handle empty ingest gracefully', () => {
    const instance = transformerRouter(
      createMockContext({
        routes: [{ match: '*', next: 'fallback' }],
      }),
    ) as Transformer.Instance;

    const result = instance.push(
      {},
      {
        ...createMockContext({}),
        ingest: undefined,
      },
    );

    expect(result).toEqual({ next: 'fallback' });
  });
});
