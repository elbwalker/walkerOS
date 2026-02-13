import type { Transformer, WalkerOS, Collector } from '@walkeros/core';
import { branch, createMockLogger } from '@walkeros/core';
import {
  runTransformerChain,
  walkChain,
  extractTransformerNextMap,
} from '../transformer';

describe('BranchResult type', () => {
  it('should be a valid transformer return type via branch() factory', () => {
    const fn: Transformer.Fn = (event, context) => {
      return branch({ name: 'test action' }, 'parser');
    };
    expect(fn).toBeDefined();
  });

  it('should accept string next', () => {
    const result = branch({ name: 'test action' }, 'parser');
    expect(result.__branch).toBe(true);
    expect(result.next).toBe('parser');
  });

  it('should accept string[] next', () => {
    const result = branch({}, ['parser', 'validator']);
    expect(result.__branch).toBe(true);
    expect(result.next).toEqual(['parser', 'validator']);
  });

  it('should satisfy Transformer.BranchResult interface', () => {
    const result: Transformer.BranchResult = branch({}, 'parser');
    expect(result.__branch).toBe(true);
    expect(result.event).toEqual({});
    expect(result.next).toBe('parser');
  });
});

// Helper to create a mock collector
function createMockCollector(
  transformers: Transformer.Transformers,
): Collector.Instance {
  return {
    transformers,
    logger: createMockLogger(),
    hooks: {},
  } as unknown as Collector.Instance;
}

// Helper to create a simple transformer
function createTransformer(
  pushFn: Transformer.Fn,
  config: Partial<Transformer.Config> = {},
): Transformer.Instance {
  return {
    type: 'test',
    config: { init: true, ...config },
    push: pushFn,
  };
}

describe('chain branching', () => {
  it('should follow branched chain when transformer returns BranchResult', async () => {
    const order: string[] = [];

    const router = createTransformer((event, context) => {
      order.push('router');
      return branch({ name: 'routed action' }, 'parser');
    });

    const parser = createTransformer((event) => {
      order.push('parser');
      expect(event.name).toBe('routed action');
      return { ...event, data: { parsed: true } };
    });

    const transformers = { router, parser };
    const collector = createMockCollector(transformers);

    const result = await runTransformerChain(
      collector,
      transformers,
      ['router'],
      {},
      undefined,
    );

    expect(order).toEqual(['router', 'parser']);
    expect(result).toEqual({ name: 'routed action', data: { parsed: true } });
  });

  it('should resolve branched next through walkChain', async () => {
    const router = createTransformer((event) => {
      return branch(event, 'a'); // 'a' links to 'b' via config.next
    });

    const a = createTransformer(
      (event) => {
        return { ...event, data: { ...event.data, a: true } };
      },
      { next: 'b' },
    );

    const b = createTransformer((event) => {
      return { ...event, data: { ...event.data, b: true } };
    });

    const transformers = { router, a, b };
    const collector = createMockCollector(transformers);

    const result = await runTransformerChain(
      collector,
      transformers,
      ['router'],
      { name: 'test action' },
      undefined,
    );

    expect(result?.data).toEqual({ a: true, b: true });
  });

  it('should pass ingest through branched chains', async () => {
    const ingestData = { path: '/gtag', body: { en: 'purchase' } };

    const router = createTransformer((event, context) => {
      expect(context.ingest).toBe(ingestData);
      return branch(event, 'parser');
    });

    const parser = createTransformer((event, context) => {
      expect(context.ingest).toBe(ingestData);
      const body = (context.ingest as any).body;
      return { name: `page ${body.en}`, data: body };
    });

    const transformers = { router, parser };
    const collector = createMockCollector(transformers);

    const result = await runTransformerChain(
      collector,
      transformers,
      ['router'],
      {},
      ingestData,
    );

    expect(result?.name).toBe('page purchase');
  });

  it('should handle branched chain returning false (drop event)', async () => {
    const router = createTransformer(() => {
      return branch({}, 'dropper');
    });

    const dropper = createTransformer(() => false);

    const transformers = { router, dropper };
    const collector = createMockCollector(transformers);

    const result = await runTransformerChain(
      collector,
      transformers,
      ['router'],
      {},
      undefined,
    );

    expect(result).toBeNull();
  });

  it('should continue after non-branching transformers in same chain', async () => {
    const order: string[] = [];

    const enricher = createTransformer((event) => {
      order.push('enricher');
      return { ...event, data: { enriched: true } };
    });

    const router = createTransformer((event) => {
      order.push('router');
      return branch(event, 'parser');
    });

    const parser = createTransformer((event) => {
      order.push('parser');
      return { ...event, name: 'parsed action' };
    });

    const transformers = { enricher, router, parser };
    const collector = createMockCollector(transformers);

    // Chain: enricher first, then router branches to parser
    const result = await runTransformerChain(
      collector,
      transformers,
      ['enricher', 'router'],
      { name: 'raw action' },
      undefined,
    );

    expect(order).toEqual(['enricher', 'router', 'parser']);
    expect(result?.data).toEqual({ enriched: true });
    expect(result?.name).toBe('parsed action');
  });

  it('should drop event when branch target does not exist', async () => {
    const router = createTransformer(() => {
      return branch({}, 'nonexistent-parser');
    });

    const transformers = { router };
    const collector = createMockCollector(transformers);

    const result = await runTransformerChain(
      collector,
      transformers,
      ['router'],
      { name: 'test action' },
      undefined,
    );

    // Branch target not found → drop event (return null), not silent continue
    expect(result).toBeNull();
  });
});
