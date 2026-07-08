import type { Transformer, WalkerOS, Collector } from '@walkeros/core';
import { branch, createMockLogger } from '@walkeros/core';
import {
  runTransformerChain,
  walkChain,
  extractTransformerNextMap,
} from '../transformer';

describe('TransformerResult branching', () => {
  it('should be a valid transformer return type via branch() factory', () => {
    const fn: Transformer.Fn = (event, context) => {
      return branch({ name: 'test action' }, 'parser');
    };
    expect(fn).toBeDefined();
  });

  it('should accept string next', () => {
    const result = branch({ name: 'test action' }, 'parser');
    expect(result.next).toBe('parser');
  });

  it('should accept string[] next', () => {
    const result = branch({}, ['parser', 'validator']);
    expect(result.next).toEqual(['parser', 'validator']);
  });

  it('should satisfy Transformer.Result interface', () => {
    const result: Transformer.Result = branch({}, 'parser');
    expect(result.event).toEqual({});
    expect(result.next).toBe('parser');
  });
});

// Helper to create a complete Collector.Instance for transformer chain tests.
// All required fields are present so the assignment to Collector.Instance does
// not need an intermediate `unknown` cast.
function createMockCollector(
  transformers: Transformer.Transformers,
): Collector.Instance {
  const noopPush: Collector.PushFn = async () => ({ ok: true });
  const noopCommand: Collector.CommandFn = async () => ({ ok: true });
  const instance: Collector.Instance = {
    push: noopPush,
    command: noopCommand,
    elb: async () => ({ ok: true }),
    allowed: true,
    config: { globalsStatic: {}, sessionStatic: {} },
    consent: {},
    custom: {},
    sources: {},
    destinations: {},
    transformers,
    stores: {},
    globals: {},
    hooks: {},
    observers: new Set(),
    logger: createMockLogger(),
    on: {},
    queue: [],
    round: 0,
    count: 0,
    stateVersion: 0,
    cellVersion: {},
    delivery: new WeakMap(),
    seenEvents: new Set(),
    session: undefined,
    status: {
      startedAt: 0,
      in: 0,
      out: 0,
      failed: 0,
      sources: {},
      destinations: {},
      dropped: {},
      connectionErrors: {},
      breakers: {},
    },
    timing: 0,
    user: {},
    pending: { destinations: {} },
  };
  return instance;
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
      return { event: { ...event, data: { parsed: true } } };
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
    expect(result.event).toEqual({
      name: 'routed action',
      data: { parsed: true },
    });
  });

  it('should resolve branched next through walkChain', async () => {
    const router = createTransformer((event) => {
      return branch(event, 'a'); // 'a' links to 'b' via config.next
    });

    const a = createTransformer(
      (event) => {
        return { event: { ...event, data: { ...event.data, a: true } } };
      },
      { next: 'b' },
    );

    const b = createTransformer((event) => {
      return { event: { ...event, data: { ...event.data, b: true } } };
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

    const singleResult0 = Array.isArray(result.event)
      ? result.event[0]
      : result.event;
    expect(singleResult0?.data).toEqual({ a: true, b: true });
  });

  it('should pass ingest through branched chains', async () => {
    // Typed body so accessing `body.en` in the parser is fully type-checked.
    const body = { en: 'purchase' };
    const ingestData = {
      _meta: { hops: 0, path: [] },
      path: '/gtag',
      body,
    };

    const router = createTransformer((event, context) => {
      expect(context.ingest).toBe(ingestData);
      return branch(event, 'parser');
    });

    const parser = createTransformer((event, context) => {
      expect(context.ingest).toBe(ingestData);
      // context.ingest is the same object reference, so reuse the typed body.
      return { event: { name: `page ${body.en}`, data: body } };
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

    expect(!Array.isArray(result.event) && result.event?.name).toBe(
      'page purchase',
    );
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

    expect(result.event).toBeNull();
  });

  it('should continue after non-branching transformers in same chain', async () => {
    const order: string[] = [];

    const enricher = createTransformer((event) => {
      order.push('enricher');
      return { event: { ...event, data: { enriched: true } } };
    });

    const router = createTransformer((event) => {
      order.push('router');
      return branch(event, 'parser');
    });

    const parser = createTransformer((event) => {
      order.push('parser');
      return { event: { ...event, name: 'parsed action' } };
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
    const singleResult1 = Array.isArray(result.event)
      ? result.event[0]
      : result.event;
    expect(singleResult1?.data).toEqual({ enriched: true });
    expect(singleResult1?.name).toBe('parsed action');
  });

  it('should resolve Route[] in config.next after transformer executes', async () => {
    const order: string[] = [];

    const enricher = createTransformer(
      (event) => {
        order.push('enricher');
        return { event: { ...event, data: { ...event.data, enriched: true } } };
      },
      {
        next: [
          {
            match: { key: 'ingest.type', operator: 'eq', value: 'api' },
            next: 'api-handler',
          },
          { next: 'default-handler' },
        ],
      },
    );

    const apiHandler = createTransformer((event) => {
      order.push('api-handler');
      return { event: { ...event, data: { ...event.data, api: true } } };
    });

    const defaultHandler = createTransformer((event) => {
      order.push('default-handler');
      return { event: { ...event, data: { ...event.data, default: true } } };
    });

    const transformers = {
      enricher,
      'api-handler': apiHandler,
      'default-handler': defaultHandler,
    };
    const collector = createMockCollector(transformers);

    const result = await runTransformerChain(
      collector,
      transformers,
      ['enricher'],
      { name: 'test' },
      { _meta: { hops: 0, path: [] }, type: 'api' }, // ingest
    );

    expect(order).toEqual(['enricher', 'api-handler']);
    const singleResult = Array.isArray(result.event)
      ? result.event[0]
      : result.event;
    expect(singleResult?.data).toEqual({ enriched: true, api: true });
  });

  it('should resolve Route[] returned from transformer push (Result.next)', async () => {
    const router = createTransformer((event) => {
      return {
        event,
        next: [
          {
            match: { key: 'ingest.path', operator: 'prefix', value: '/api' },
            next: 'api',
          },
          { next: 'fallback' },
        ],
      };
    });

    const api = createTransformer((event) => {
      return { event: { ...event, data: { handler: 'api' } } };
    });

    const fallback = createTransformer((event) => {
      return { event: { ...event, data: { handler: 'fallback' } } };
    });

    const transformers = { router, api, fallback };
    const collector = createMockCollector(transformers);

    const result = await runTransformerChain(
      collector,
      transformers,
      ['router'],
      {},
      { _meta: { hops: 0, path: [] }, path: '/api/data' },
    );

    const singleResult2 = Array.isArray(result.event)
      ? result.event[0]
      : result.event;
    expect(singleResult2?.data).toEqual({ handler: 'api' });
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
    expect(result.event).toBeNull();
  });

  it('forkResult.next supports many fan-out (each branch produces its own event)', async () => {
    // Each branch records the event it received at entry. Under SEQUENTIAL
    // execution (the pre-Task-3.2 behavior, where `walkChain` treats a
    // string[] as a single chain), `a` runs first, mutates the event with
    // `{ data: { touchedBy: 'a' } }`, and `b` then sees that mutation. Under
    // true fan-out, each branch starts from the parent event independently,
    // so `b` must NOT see `a`'s mutation. This assertion fails under the old
    // sequential walk and passes only when each fork branch dispatches as
    // its own subchain with an isolated ingest.
    const seenByA: WalkerOS.DeepPartialEvent[] = [];
    const seenByB: WalkerOS.DeepPartialEvent[] = [];
    const router = createTransformer(() => [
      { event: { name: 'fanA' }, next: { many: ['a', 'b'] } },
    ]);
    const a = createTransformer((e) => {
      seenByA.push(e);
      return { event: { ...e, data: { touchedBy: 'a' } } };
    });
    const b = createTransformer((e) => {
      seenByB.push(e);
      return { event: e };
    });
    const transformers = { router, a, b };
    await runTransformerChain(
      createMockCollector(transformers),
      transformers,
      ['router'],
      {},
    );
    // Both branches MUST run. Order is parallel — assert membership, not order.
    expect(seenByA).toHaveLength(1);
    expect(seenByB).toHaveLength(1);
    // Fan-out semantic: b sees the parent event, NOT a's mutation. Under the
    // old sequential walk this would fail because b would receive
    // { name: 'fanA', data: { touchedBy: 'a' } }.
    expect(seenByB[0]).toEqual({ name: 'fanA' });
    expect(seenByA[0]).toEqual({ name: 'fanA' });
  });
});
