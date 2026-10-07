/**
 * FlowState stamping shapes that every emitting site shares: which records
 * carry the journey trio, the store op records, and the error projection.
 */
import type {
  Destination,
  FlowState,
  Store,
  Transformer,
} from '@walkeros/core';
import { startFlow } from '..';

const TRACE = '0af7651916cd43dd8448eb211c80319c';
const JOURNEY_KEYS = ['traceId', 'sourceId', 'parentEventId'];

/** A Map-backed store whose ops can be made to fail. */
function memoryStore(fail = false): Store.Init {
  const data = new Map<string, Store.StoreValue>();
  return () => ({
    type: 'memory',
    config: {},
    get: async (key: string) => {
      if (fail) throw new TypeError('store down');
      return data.get(key);
    },
    set: async (key: string, value: Store.StoreValue) => {
      data.set(key, value);
    },
    delete: async (key: string) => {
      data.delete(key);
    },
  });
}

function spy(): Destination.Instance {
  return {
    type: 'spy',
    config: {},
    init: () => undefined,
    push: () => undefined,
  };
}

describe('journey fields', () => {
  it('stamp event records but never store or init records', async () => {
    const states: FlowState[] = [];
    const { collector, elb } = await startFlow({
      stores: { kv: { code: memoryStore() } },
      destinations: {
        spy: {
          code: spy(),
          state: {
            mode: 'set',
            store: 'kv',
            key: 'event.name',
            value: 'event.data.v',
          },
        },
      },
    });
    collector.trace = TRACE;
    collector.observers.add((state) => states.push(state));

    await elb({ name: 'page view', data: { v: 1 } });

    const event = states.find(
      (s) => s.stepId === 'destination.spy' && s.phase === 'in',
    );
    expect(event?.traceId).toBe(TRACE);
    expect(Object.keys(event ?? {}).slice(0, 8)).toEqual([
      'flowId',
      'stepId',
      'stepType',
      'phase',
      'eventId',
      'timestamp',
      'elapsedMs',
      'traceId',
    ]);

    const init = states.find((s) => s.phase === 'init');
    const store = states.filter((s) => s.stepType === 'store');
    expect(init).toBeDefined();
    expect(store.length).toBeGreaterThan(0);
    for (const state of [init, ...store]) {
      for (const key of JOURNEY_KEYS) expect(state).not.toHaveProperty(key);
    }
  });
});

describe('store records', () => {
  it('emit in and out for a delete op', async () => {
    const states: FlowState[] = [];
    const { collector } = await startFlow({
      stores: { kv: { code: memoryStore() } },
    });
    collector.observers.add((state) => states.push(state));

    await collector.stores.kv.delete('k');

    expect(states.map((s) => [s.stepId, s.phase, s.meta])).toEqual([
      ['store.kv', 'in', { op: 'delete', key: 'k' }],
      ['store.kv', 'out', { op: 'delete', key: 'k' }],
    ]);
    expect(states[1].eventId).toBe('');
    expect(typeof states[1].durationMs).toBe('number');
  });

  it('emit an error record when an op throws', async () => {
    const states: FlowState[] = [];
    const { collector } = await startFlow({
      stores: { kv: { code: memoryStore(true) } },
    });
    collector.observers.add((state) => states.push(state));

    await expect(collector.stores.kv.get('k')).rejects.toThrow('store down');

    const error = states.find((s) => s.phase === 'error');
    expect(error?.stepId).toBe('store.kv');
    expect(error?.meta).toEqual({ op: 'get', key: 'k' });
    expect(error?.error).toEqual({ name: 'TypeError', message: 'store down' });
    expect(typeof error?.durationMs).toBe('number');
  });
});

describe('error projection', () => {
  async function errorOf(thrown: unknown): Promise<FlowState['error']> {
    const states: FlowState[] = [];
    const failing: Transformer.InitTransformer = {
      code: async (context) => ({
        type: 'failing',
        config: context.config,
        push: () => {
          throw thrown;
        },
      }),
    };
    const { collector, elb } = await startFlow({
      logger: { handler: () => undefined },
      transformers: { failing },
      destinations: { spy: { before: ['failing'], code: spy() } },
    });
    collector.observers.add((state) => states.push(state));

    await elb({ name: 'page view', data: {} });

    return states.find(
      (s) => s.stepId === 'transformer.failing' && s.phase === 'error',
    )?.error;
  }

  it('keeps the name of an Error', async () => {
    class VendorError extends Error {
      name = 'VendorError';
    }
    expect(await errorOf(new VendorError('rejected'))).toEqual({
      name: 'VendorError',
      message: 'rejected',
    });
  });

  it('has no name for a non-Error throw', async () => {
    const error = await errorOf('boom');
    expect(error).toEqual({ message: 'boom' });
    expect(error).not.toHaveProperty('name');
  });
});
