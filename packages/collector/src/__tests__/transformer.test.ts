import type { Collector, Transformer, WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import {
  walkChain,
  runTransformerChain,
  transformerInit,
  transformerPush,
  initTransformers as initTransformersFunc,
  extractTransformerNextMap,
  extractChainProperty,
} from '../transformer';
import { createCacheStore } from '../cache-store';

describe('Transformer', () => {
  // Mock collector for tests
  function createMockCollector(
    overrides: Partial<Collector.Instance> = {},
  ): Collector.Instance {
    const mockLogger = createMockLogger();

    return {
      allowed: true,
      config: { globalsStatic: {}, sessionStatic: {} },
      consent: {},
      custom: {},
      destinations: {},
      transformers: {},
      globals: {},
      hooks: {},
      logger: mockLogger,
      on: {},
      queue: [],
      round: 0,
      session: undefined,
      timing: Date.now(),
      user: {},
      sources: {},
      pendingSources: [],
      push: jest.fn(),
      command: jest.fn(),
      status: {
        startedAt: 0,
        in: 0,
        out: 0,
        failed: 0,
        sources: {},
        destinations: {},
      },
      ...overrides,
    } as unknown as Collector.Instance;
  }

  // Mock transformer factory
  function createMockTransformer(
    overrides: Partial<Transformer.Instance> = {},
  ): Transformer.Instance {
    return {
      type: 'mock',
      config: {},
      push: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  describe('walkChain', () => {
    test('returns empty array for undefined startId', () => {
      const result = walkChain(undefined, {});
      expect(result).toEqual([]);
    });

    test('returns empty array for empty transformers', () => {
      const result = walkChain('a', {});
      expect(result).toEqual([]);
    });

    test('walks single transformer', () => {
      const transformers = { a: {} };
      const result = walkChain('a', transformers);
      expect(result).toEqual(['a']);
    });

    test('walks chain of transformers', () => {
      const transformers = {
        a: { next: 'b' },
        b: { next: 'c' },
        c: {},
      };
      const result = walkChain('a', transformers);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    test('detects circular reference and stops', () => {
      const transformers = {
        a: { next: 'b' },
        b: { next: 'a' }, // Circular!
      };
      const result = walkChain('a', transformers);
      expect(result).toEqual(['a', 'b']);
    });

    test('stops at missing transformer', () => {
      const transformers = {
        a: { next: 'missing' },
      };
      const result = walkChain('a', transformers);
      expect(result).toEqual(['a']);
    });

    test('returns array directly when provided', () => {
      const chain = walkChain(['a', 'b', 'c'], {});
      expect(chain).toEqual(['a', 'b', 'c']);
    });

    test('ignores transformer.next when array provided at start', () => {
      const chain = walkChain(['a'], { a: { next: 'b' }, b: {} });
      expect(chain).toEqual(['a']);
    });

    test('still walks chain for string input', () => {
      const chain = walkChain('a', { a: { next: 'b' }, b: {} });
      expect(chain).toEqual(['a', 'b']);
    });

    test('appends array next and stops when encountered during walk', () => {
      const chain = walkChain('a', {
        a: { next: 'b' },
        b: { next: ['c', 'd'] },
        c: { next: 'e' },
        d: {},
        e: {},
      });
      expect(chain).toEqual(['a', 'b', 'c', 'd']);
    });

    test('handles empty array at start', () => {
      const chain = walkChain([], { a: { next: 'b' } });
      expect(chain).toEqual([]);
    });
  });

  describe('runTransformerChain', () => {
    test('returns original event for empty chain', async () => {
      const collector = createMockCollector();
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runTransformerChain(collector, {}, [], event);

      expect(result.event).toEqual(event);
    });

    test('passes event through transformer that returns void', async () => {
      const collector = createMockCollector();
      const mockPush = jest.fn().mockResolvedValue(undefined);
      const transformers = {
        passthrough: createMockTransformer({ push: mockPush }),
      };
      collector.transformers = transformers;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['passthrough'],
        event,
      );

      expect(mockPush).toHaveBeenCalledWith(event, expect.any(Object));
      expect(result.event).toEqual(event);
    });

    test('uses modified event from transformer', async () => {
      const collector = createMockCollector();
      const modifiedEvent = { name: 'page view', data: { modified: true } };
      const mockPush = jest.fn().mockResolvedValue({ event: modifiedEvent });
      const transformers = {
        modifier: createMockTransformer({ push: mockPush }),
      };
      collector.transformers = transformers;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['modifier'],
        event,
      );

      expect(result.event).toEqual(modifiedEvent);
    });

    test('stops chain when transformer returns false', async () => {
      const collector = createMockCollector();
      const mockPush1 = jest.fn().mockResolvedValue(false);
      const mockPush2 = jest.fn();
      const transformers = {
        stopper: createMockTransformer({ push: mockPush1 }),
        never: createMockTransformer({ push: mockPush2 }),
      };
      collector.transformers = transformers;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['stopper', 'never'],
        event,
      );

      expect(result.event).toBeNull();
      expect(mockPush1).toHaveBeenCalled();
      expect(mockPush2).not.toHaveBeenCalled();
    });

    test('stops chain when transformer throws error', async () => {
      const collector = createMockCollector();
      const mockPush1 = jest.fn().mockRejectedValue(new Error('fail'));
      const mockPush2 = jest.fn();
      const transformers = {
        thrower: createMockTransformer({ push: mockPush1 }),
        never: createMockTransformer({ push: mockPush2 }),
      };
      collector.transformers = transformers;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['thrower', 'never'],
        event,
      );

      expect(result.event).toBeNull();
      expect(mockPush1).toHaveBeenCalled();
      expect(mockPush2).not.toHaveBeenCalled();
    });

    test('chains multiple transformers in order', async () => {
      const collector = createMockCollector();
      const callOrder: string[] = [];
      const mockPush1 = jest.fn().mockImplementation(async (event) => {
        callOrder.push('first');
        return { event: { ...event, data: { ...event.data, first: true } } };
      });
      const mockPush2 = jest.fn().mockImplementation(async (event) => {
        callOrder.push('second');
        return { event: { ...event, data: { ...event.data, second: true } } };
      });
      const transformers = {
        first: createMockTransformer({ push: mockPush1 }),
        second: createMockTransformer({ push: mockPush2 }),
      };
      collector.transformers = transformers;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view', data: {} };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['first', 'second'],
        event,
      );

      expect(callOrder).toEqual(['first', 'second']);
      expect(result.event).toEqual({
        name: 'page view',
        data: { first: true, second: true },
      });
    });

    test('skips missing transformer and continues', async () => {
      const collector = createMockCollector();
      const mockPush = jest.fn().mockResolvedValue(undefined);
      const transformers = {
        exists: createMockTransformer({ push: mockPush }),
      };
      collector.transformers = transformers;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['missing', 'exists'],
        event,
      );

      expect(mockPush).toHaveBeenCalled();
      expect(result.event).toEqual(event);
    });

    it('transformer.before: many on transformer.before spawns parallel before-chains', async () => {
      const collector = createMockCollector();
      const seen: string[] = [];
      const audit = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          seen.push('audit');
          return { event: e };
        }),
      });
      const log = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          seen.push('log');
          return { event: e };
        }),
      });
      const inner = createMockTransformer({
        config: { before: { many: ['audit', 'log'] } },
        push: jest.fn().mockImplementation(async (e) => {
          seen.push('inner');
          return { event: e };
        }),
      });
      const transformers = { audit, log, inner };
      collector.transformers = transformers;
      await runTransformerChain(collector, transformers, ['inner'], {});
      expect(seen.sort()).toEqual(['audit', 'inner', 'log']);
    });

    it('result.next: many terminates main chain and fans out to N subchains', async () => {
      const collector = createMockCollector();
      // Strong assertions per Tasks 3.1 / 3.2 discipline:
      // 1. tail never sees the head event (main chain terminates).
      // 2. y sees the parent event UN-mutated by x (true fan-out, not a
      //    sequential walk of ['x', 'y']).
      const trailX: WalkerOS.DeepPartialEvent[] = [];
      const trailY: WalkerOS.DeepPartialEvent[] = [];
      const trailTail: WalkerOS.DeepPartialEvent[] = [];
      const head = createMockTransformer({
        push: jest.fn().mockImplementation(async () => ({
          event: { name: 'h' },
          next: { many: ['x', 'y'] },
        })),
      });
      const tail = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          trailTail.push(e);
          return { event: e };
        }),
      });
      const x = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          trailX.push(e);
          return { event: { ...e, data: { touchedBy: 'x' } } };
        }),
      });
      const y = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          trailY.push(e);
          return { event: e };
        }),
      });
      const transformers = { head, tail, x, y };
      collector.transformers = transformers;
      await runTransformerChain(collector, transformers, ['head', 'tail'], {});
      // Both branches must run.
      expect(trailX).toHaveLength(1);
      expect(trailY).toHaveLength(1);
      // Main chain must terminate — `tail` must NOT have received the head event.
      expect(trailTail).toHaveLength(0);
      // Fan-out semantic: y sees the parent event, NOT x's mutation. Under
      // the old sequential walk (walkChain(['x','y'])) this would fail
      // because y would receive { name: 'h', data: { touchedBy: 'x' } }.
      expect(trailY[0]).toEqual({ name: 'h' });
      expect(trailX[0]).toEqual({ name: 'h' });
    });

    it('config.next: many on transformer config produces fan-out (each branch independent)', async () => {
      const collector = createMockCollector();
      // Each branch receives the routed event UN-mutated by sibling branch.
      // Under SEQUENTIAL execution (the pre-fan-out behavior, where the
      // dispatcher walks p then q as a chain), p mutates the event with
      // `{ data: { touchedBy: 'p' } }` and q then sees that mutation. Under
      // true fan-out, q must see the parent event unchanged.
      const seenByP: WalkerOS.DeepPartialEvent[] = [];
      const seenByQ: WalkerOS.DeepPartialEvent[] = [];
      const router = createMockTransformer({
        config: { next: { many: ['p', 'q'] } },
        push: jest.fn().mockImplementation(async () => ({
          event: { name: 'routed' },
        })),
      });
      const p = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          seenByP.push(e);
          return { event: { ...e, data: { touchedBy: 'p' } } };
        }),
      });
      const q = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          seenByQ.push(e);
          return { event: e };
        }),
      });
      const transformers = { router, p, q };
      collector.transformers = transformers;
      await runTransformerChain(collector, transformers, ['router'], {});
      // Both branches must run.
      expect(seenByP).toHaveLength(1);
      expect(seenByQ).toHaveLength(1);
      // Fan-out semantic: q sees the parent event, NOT p's mutation. Under
      // the old sequential walk this would fail because q would receive
      // { name: 'routed', data: { touchedBy: 'p' } }.
      expect(seenByQ[0]).toEqual({ name: 'routed' });
      expect(seenByP[0]).toEqual({ name: 'routed' });
    });

    it('many: one branch throwing does not kill siblings', async () => {
      const collector = createMockCollector();
      const seen: string[] = [];
      const router = createMockTransformer({
        push: jest.fn().mockImplementation(async () => ({
          event: { name: 'route' },
          next: { many: ['boom', 'ok'] },
        })),
      });
      const boom = createMockTransformer({
        push: jest.fn().mockImplementation(async () => {
          seen.push('boom-tried');
          throw new Error('intentional');
        }),
      });
      const ok = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          seen.push('ok');
          return { event: e };
        }),
      });
      const transformers = { router, boom, ok };
      collector.transformers = transformers;
      await runTransformerChain(collector, transformers, ['router'], {});
      expect(seen).toContain('boom-tried');
      expect(seen).toContain('ok');
    });

    it('many: one branch returning false does not kill siblings', async () => {
      const collector = createMockCollector();
      const seen: string[] = [];
      const router = createMockTransformer({
        push: jest.fn().mockImplementation(async () => ({
          event: { name: 'route' },
          next: { many: ['stop', 'ok'] },
        })),
      });
      const stop = createMockTransformer({
        push: jest.fn().mockImplementation(async () => false),
      });
      const ok = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          seen.push('ok');
          return { event: e };
        }),
      });
      const transformers = { router, stop, ok };
      collector.transformers = transformers;
      await runTransformerChain(collector, transformers, ['router'], {});
      expect(seen).toEqual(['ok']);
    });

    it('many strips respond propagation: parent caller sees no wrapped respond', async () => {
      const collector = createMockCollector();
      // Properly typed respond: RespondFn = (options?: RespondOptions) => void.
      // No `as unknown` cast — the no-op respond satisfies the signature
      // directly, and the test only asserts on respond presence/absence at
      // the parent boundary, not on call semantics.
      const respondA: import('@walkeros/core').RespondFn = () => {};
      const respondB: import('@walkeros/core').RespondFn = () => {};
      const router = createMockTransformer({
        push: jest.fn().mockImplementation(async () => ({
          event: { name: 'r' },
          next: { many: ['a', 'b'] },
        })),
      });
      const a = createMockTransformer({
        push: jest
          .fn()
          .mockImplementation(async (e) => ({ event: e, respond: respondA })),
      });
      const b = createMockTransformer({
        push: jest
          .fn()
          .mockImplementation(async (e) => ({ event: e, respond: respondB })),
      });
      const transformers = { router, a, b };
      collector.transformers = transformers;
      const result = await runTransformerChain(
        collector,
        transformers,
        ['router'],
        {},
      );
      expect(result.respond).toBeUndefined();
    });

    it('many inside many dispatches the union of branches', async () => {
      // Task 6.2 — nested fan-out: head → many: [midA, midB] where
      // midA fans out to [x, y] and midB chains to z. All three terminal
      // IDs must be reached as independent flows. Verifies graph traversal,
      // not parallel-vs-sequential isolation (each terminal pushes a single
      // token; reachability via `seen.sort()` membership is sufficient).
      const collector = createMockCollector();
      const seen: string[] = [];
      const head = createMockTransformer({
        push: jest.fn().mockImplementation(async () => ({
          event: { name: 'h' },
          next: { many: ['midA', 'midB'] },
        })),
      });
      const midA = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => ({
          event: e,
          next: { many: ['x', 'y'] },
        })),
      });
      const midB = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => ({
          event: e,
          next: 'z',
        })),
      });
      const x = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          seen.push('x');
          return { event: e };
        }),
      });
      const y = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          seen.push('y');
          return { event: e };
        }),
      });
      const z = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          seen.push('z');
          return { event: e };
        }),
      });
      const transformers = { head, midA, midB, x, y, z };
      collector.transformers = transformers;
      await runTransformerChain(collector, transformers, ['head'], {});
      expect(seen.sort()).toEqual(['x', 'y', 'z']);
    });

    it('many cycle is bounded by MAX_PATH_LENGTH', async () => {
      // Task 6.2 — cycle defense: a → many: [b]; b → many: [a]. The
      // path-length valve in runTransformerChain (MAX_PATH_LENGTH = 256)
      // must trip per-branch, terminating the cycle. cloneIngest must
      // deep-copy `_meta.path` (not share the array reference) so the
      // budget accumulates per fan-out branch.
      const collector = createMockCollector();
      const a = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => ({
          event: e,
          next: { many: ['b'] },
        })),
      });
      const b = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => ({
          event: e,
          next: { many: ['a'] },
        })),
      });
      const transformers = { a, b };
      collector.transformers = transformers;
      const result = await runTransformerChain(
        collector,
        transformers,
        ['a'],
        {},
      );
      // Path-length valve trips per-branch; runtime returns instead of
      // hanging or throwing.
      expect(result).toBeDefined();
    }, 5000);

    it('many: cache.stop in one branch does not halt sibling branches', async () => {
      // Regression guard for Task 4.3 (route grammar refactor).
      //
      // When a `many` branch HITs a `cache.stop: true` cache, that branch's
      // `runTransformerChain` returns `{ event, respond, stopped: true }`.
      // The pipeline-halt `stopped` discriminator is branch-internal: it MUST
      // NOT propagate to sibling branches under the same `many` dispatch.
      //
      // Task 4.2 added the per-branch side-channel strip (respond AND stopped)
      // at every `many` dispatch site in `runTransformerChain`. This test
      // covers Site 1 (`result.next: { many }` from the router transformer's
      // push result, lines ~924-942 in transformer.ts). Because each branch
      // runs in its own `runTransformerChain` invocation under `Promise.all`,
      // sibling branches are dispatched concurrently and a `stopped: true`
      // return from one branch cannot starve siblings.
      const seen: string[] = [];

      // Prime the cache store before running. The `stopBranch` transformer's
      // cache rule keys off `event.name`. After fan-out, both branches receive
      // the routed event `{ name: 'r' }`, so we pre-set key 'r' to force a HIT
      // in stopBranch only (normal has no cache).
      const cacheStore = createCacheStore({ sweepIntervalMs: 0 });
      cacheStore.set('r', { name: 'r' }, 60_000);

      const router = createMockTransformer({
        push: jest.fn().mockImplementation(async () => ({
          event: { name: 'r' },
          next: { many: ['stopBranch', 'normal'] },
        })),
      });
      const stopBranch = createMockTransformer({
        config: {
          cache: {
            stop: true,
            rules: [{ key: ['event.name'], ttl: 1000 }],
          },
        },
        push: jest.fn().mockImplementation(async (e) => {
          seen.push('stopBranch');
          return { event: e };
        }),
      });
      const normal = createMockTransformer({
        push: jest.fn().mockImplementation(async (e) => {
          seen.push('normal');
          return { event: e };
        }),
      });

      const collector = createMockCollector({
        stores: { __cache: cacheStore },
      });
      const transformers = { router, stopBranch, normal };
      collector.transformers = transformers;

      await runTransformerChain(collector, transformers, ['router'], {
        name: 'r',
      });

      // stopBranch HIT the cache → its push was skipped (cache HIT returns
      // before the push call). normal has no cache → its push ran.
      // The critical assertion: branch isolation under `many`.
      expect(seen).toContain('normal');
      expect(seen).not.toContain('stopBranch');
    });
  });

  describe('transformerInit', () => {
    test('returns true for transformer without init function', async () => {
      const collector = createMockCollector();
      const transformer = createMockTransformer();

      const result = await transformerInit(
        collector,
        transformer,
        'test-transformer',
      );

      expect(result).toBe(true);
    });

    test('calls init function and marks as initialized', async () => {
      const collector = createMockCollector();
      const mockInit = jest.fn().mockResolvedValue({ setting: 'value' });
      const transformer = createMockTransformer({
        init: mockInit,
        config: { init: false },
      });

      const result = await transformerInit(
        collector,
        transformer,
        'test-transformer',
      );

      expect(result).toBe(true);
      expect(mockInit).toHaveBeenCalled();
      expect(transformer.config.init).toBe(true);
    });

    test('returns false when init returns false', async () => {
      const collector = createMockCollector();
      const mockInit = jest.fn().mockResolvedValue(false);
      const transformer = createMockTransformer({
        init: mockInit,
        config: { init: false },
      });

      const result = await transformerInit(
        collector,
        transformer,
        'test-transformer',
      );

      expect(result).toBe(false);
    });

    test('skips init if already initialized', async () => {
      const collector = createMockCollector();
      const mockInit = jest.fn();
      const transformer = createMockTransformer({
        init: mockInit,
        config: { init: true }, // Already initialized
      });

      const result = await transformerInit(
        collector,
        transformer,
        'test-transformer',
      );

      expect(result).toBe(true);
      expect(mockInit).not.toHaveBeenCalled();
    });

    test('preserves config.env when init returns new config', async () => {
      const collector = createMockCollector();
      const storeRef = { get: jest.fn(), set: jest.fn(), delete: jest.fn() };
      const mockInit = jest
        .fn()
        .mockResolvedValue({ settings: { updated: true } });
      const transformer = createMockTransformer({
        init: mockInit,
        config: { init: false, env: { store: storeRef } },
      });

      await transformerInit(collector, transformer, 'test-transformer');

      expect(transformer.config.init).toBe(true);
      expect(transformer.config.env).toBeDefined();
      expect(transformer.config.env!.store).toBe(storeRef);
    });
  });

  describe('transformerPush', () => {
    test('calls transformer push with event and context', async () => {
      const collector = createMockCollector();
      const mockPush = jest.fn().mockResolvedValue(undefined);
      const transformer = createMockTransformer({ push: mockPush });
      const event: WalkerOS.DeepPartialEvent = { name: 'test event' };

      await transformerPush(collector, transformer, 'test-transformer', event);

      expect(mockPush).toHaveBeenCalledWith(
        event,
        expect.objectContaining({
          collector,
          config: transformer.config,
        }),
      );
    });

    test('returns modified event from transformer', async () => {
      const collector = createMockCollector();
      const modifiedEvent = { name: 'modified', data: { changed: true } };
      const mockPush = jest.fn().mockResolvedValue({ event: modifiedEvent });
      const transformer = createMockTransformer({ push: mockPush });
      const event: WalkerOS.DeepPartialEvent = { name: 'original' };

      const result = await transformerPush(
        collector,
        transformer,
        'test-transformer',
        event,
      );

      expect(result).toEqual({ event: modifiedEvent });
    });

    test('returns false when transformer stops chain', async () => {
      const collector = createMockCollector();
      const mockPush = jest.fn().mockResolvedValue(false);
      const transformer = createMockTransformer({ push: mockPush });
      const event: WalkerOS.DeepPartialEvent = { name: 'test' };

      const result = await transformerPush(
        collector,
        transformer,
        'test-transformer',
        event,
      );

      expect(result).toBe(false);
    });
  });

  describe('extractTransformerNextMap', () => {
    test('extracts next from transformer instances', () => {
      const transformers: Transformer.Transformers = {
        a: createMockTransformer({ config: { next: 'b' } }),
        b: createMockTransformer({ config: { next: 'c' } }),
        c: createMockTransformer({ config: {} }),
      };

      const result = extractTransformerNextMap(transformers);

      expect(result).toEqual({
        a: { next: 'b' },
        b: { next: 'c' },
        c: {},
      });
    });

    test('handles array next values', () => {
      const transformers: Transformer.Transformers = {
        a: createMockTransformer({ config: { next: ['b', 'c'] } }),
      };

      const result = extractTransformerNextMap(transformers);

      expect(result).toEqual({
        a: { next: ['b', 'c'] },
      });
    });

    test('handles empty transformers', () => {
      const result = extractTransformerNextMap({});
      expect(result).toEqual({});
    });

    test('handles transformers without next', () => {
      const transformers: Transformer.Transformers = {
        a: createMockTransformer({ config: {} }),
      };

      const result = extractTransformerNextMap(transformers);

      expect(result).toEqual({ a: {} });
    });
  });

  describe('extractChainProperty', () => {
    test('extracts and merges chain property into config', () => {
      const definition = {
        code: jest.fn(),
        config: { settings: { foo: 'bar' } },
        next: 'enrich',
      };

      const result = extractChainProperty(definition, 'next');

      expect(result.config).toEqual({
        settings: { foo: 'bar' },
        next: 'enrich',
      });
      expect(result.chainValue).toBe('enrich');
    });

    test('handles before property for destinations', () => {
      const definition = {
        code: { type: 'test', config: {}, push: jest.fn() },
        config: {},
        before: 'redact',
      };

      const result = extractChainProperty(definition, 'before');

      expect(result.config).toEqual({ before: 'redact' });
      expect(result.chainValue).toBe('redact');
    });

    test('handles array chain values', () => {
      const definition = {
        code: jest.fn(),
        config: {},
        next: ['a', 'b', 'c'],
      };

      const result = extractChainProperty(definition, 'next');

      expect(result.config.next).toEqual(['a', 'b', 'c']);
      expect(result.chainValue).toEqual(['a', 'b', 'c']);
    });

    test('returns unchanged config when no chain property', () => {
      const definition = {
        code: jest.fn(),
        config: { settings: { foo: 'bar' } },
      };

      const result = extractChainProperty(definition, 'next');

      expect(result.config).toEqual({ settings: { foo: 'bar' } });
      expect(result.chainValue).toBeUndefined();
    });

    test('definition-level takes precedence over config-level', () => {
      const definition = {
        code: jest.fn(),
        config: { next: 'existing' },
        next: 'override',
      };

      const result = extractChainProperty(definition, 'next');

      expect(result.config.next).toBe('override');
    });
  });

  describe('initTransformers', () => {
    test('merges next from definition into instance config', async () => {
      const collector = createMockCollector();

      const initTransformers: Transformer.InitTransformers = {
        validate: {
          code: async (context) => ({
            type: 'validator',
            config: context.config,
            push: jest.fn(),
          }),
          config: { settings: { strict: true } },
          next: 'enrich',
        },
      };

      const result = await initTransformersFunc(collector, initTransformers);

      expect(result.validate.config.next).toBe('enrich');
      expect(result.validate.config.settings).toEqual({ strict: true });
    });

    test('handles array next property', async () => {
      const collector = createMockCollector();

      const initTransformers: Transformer.InitTransformers = {
        validate: {
          code: async (context) => ({
            type: 'validator',
            config: context.config,
            push: jest.fn(),
          }),
          next: ['enrich', 'redact'],
        },
      };

      const result = await initTransformersFunc(collector, initTransformers);

      expect(result.validate.config.next).toEqual(['enrich', 'redact']);
    });

    test('does not add next when not specified', async () => {
      const collector = createMockCollector();

      const initTransformers: Transformer.InitTransformers = {
        validate: {
          code: async (context) => ({
            type: 'validator',
            config: context.config,
            push: jest.fn(),
          }),
        },
      };

      const result = await initTransformersFunc(collector, initTransformers);

      expect(result.validate.config.next).toBeUndefined();
    });
  });
});
