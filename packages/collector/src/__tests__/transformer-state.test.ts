import { startFlow } from '..';
import type { Store, Transformer, WalkerOS } from '@walkeros/core';

/**
 * Build a store backed by a Map the test holds a reference to, so writes are
 * directly observable. Registered under a named id and targeted via
 * `state.store`.
 */
function makeBackedStore(): {
  code: Store.Init;
  data: Map<string, Store.StoreValue>;
} {
  const data = new Map<string, Store.StoreValue>();
  const code: Store.Init = (context) => ({
    type: 'kv',
    config: context.config as Store.Config,
    get: async (key: string) => data.get(key),
    set: async (key: string, value: Store.StoreValue) => {
      data.set(key, value);
    },
    delete: async (key: string) => {
      data.delete(key);
    },
  });
  return { code, data };
}

/**
 * Integration tests for the declarative `state` block on transformer steps.
 *
 * Chain order under test (per position):
 *   before → state[get] → step mapping → state[set] → next dispatch.
 */
describe('Transformer state integration', () => {
  it('set runs after the step mapping (reads a field the mapping wrote)', async () => {
    const destinationEvents: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      transformers: {
        enricher: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'enricher',
            config: ctx.config,
            push(event) {
              // mapping writes data.token; the set entry then reads it
              return {
                event: { ...event, data: { ...event.data, token: 'T1' } },
              };
            },
          }),
          // set: store data.token keyed by user.id
          state: { mode: 'set', key: 'user.id', value: 'data.token' },
        },
        reader: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'reader',
            config: ctx.config,
            push(event) {
              return { event };
            },
          }),
          // get: fetch the stored token onto data.fetchedToken
          state: { mode: 'get', key: 'user.id', value: 'data.fetchedToken' },
        },
      },
      destinations: {
        spy: {
          before: ['enricher', 'reader'],
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    await elb({ name: 'page view', user: { id: 'u1' }, data: {} });

    expect(destinationEvents).toHaveLength(1);
    // set wrote 'T1' under key u1; reader's get fetched it back
    expect(destinationEvents[0].data?.fetchedToken).toBe('T1');
  });

  it('runs a transformer that has only state (no code)', async () => {
    const destinationEvents: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      transformers: {
        stasher: {
          // no code — state-only path step
          state: { mode: 'set', key: 'user.id', value: 'data.token' },
        },
        fetcher: {
          state: { mode: 'get', key: 'user.id', value: 'data.fetched' },
        },
      },
      destinations: {
        spy: {
          before: ['stasher', 'fetcher'],
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    await elb({ name: 'page view', user: { id: 'u9' }, data: { token: 'X9' } });

    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].data?.fetched).toBe('X9');
  });

  it('composes with an existing cache on the same step', async () => {
    let enricherCalls = 0;
    const destinationEvents: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      transformers: {
        enricher: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'enricher',
            config: ctx.config,
            push(event) {
              enricherCalls++;
              return {
                event: { ...event, data: { ...event.data, token: 'C1' } },
              };
            },
          }),
          cache: { rules: [{ key: ['event.name'], ttl: 60 }] },
          state: { mode: 'set', key: 'user.id', value: 'data.token' },
        },
      },
      destinations: {
        spy: {
          before: 'enricher',
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    await elb({ name: 'page view', user: { id: 'u1' }, data: {} });
    expect(enricherCalls).toBe(1);
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].data?.token).toBe('C1');
  });

  it('accepts an array of state entries (get before mapping, set after)', async () => {
    const destinationEvents: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      transformers: {
        // seed the store first
        seeder: {
          state: { mode: 'set', key: 'user.id', value: 'data.seed' },
        },
        // one step carrying both a get and a set in an array: the get reads
        // the seeded value (runs before mapping), the set writes data.token
        // (runs after mapping)
        both: {
          state: [
            { mode: 'get', key: 'user.id', value: 'data.echo' },
            { mode: 'set', key: 'user.id', value: 'data.token' },
          ],
        },
        // verify the set landed by reading the key back
        verifier: {
          state: { mode: 'get', key: 'user.id', value: 'data.verified' },
        },
      },
      destinations: {
        spy: {
          before: ['seeder', 'both', 'verifier'],
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    await elb({
      name: 'page view',
      user: { id: 'u2' },
      data: { seed: 'S2', token: 'T2' },
    });

    expect(destinationEvents).toHaveLength(1);
    // get in the array fetched the seeded value
    expect(destinationEvents[0].data?.echo).toBe('S2');
    // set in the array wrote data.token, overwriting the key; verifier read it
    expect(destinationEvents[0].data?.verified).toBe('T2');
  });

  it('is fail-open: a store error leaves the event flowing', async () => {
    const destinationEvents: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      stores: {
        boom: {
          code: async () => ({
            type: 'boom',
            config: {},
            get: async () => {
              throw new Error('get failed');
            },
            set: async () => {
              throw new Error('set failed');
            },
            delete: async () => undefined,
          }),
        },
      },
      transformers: {
        stasher: {
          state: {
            mode: 'set',
            store: 'boom',
            key: 'user.id',
            value: 'data.token',
          },
        },
      },
      destinations: {
        spy: {
          before: 'stasher',
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    await elb({ name: 'page view', user: { id: 'u3' }, data: { token: 'Z3' } });

    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].data?.token).toBe('Z3');
  });

  it('propagates def-level state when the factory returns a fresh config', async () => {
    const { code: storeCode, data } = makeBackedStore();

    const { elb } = await startFlow({
      stores: { kv: { code: storeCode } },
      transformers: {
        // factory returns a fresh config object that omits state; the
        // def-level state must still land on instance.config post-init
        fresh: {
          code: async (): Promise<Transformer.Instance> => ({
            type: 'fresh',
            config: {},
            push(event) {
              return { event };
            },
          }),
          state: {
            mode: 'set',
            store: 'kv',
            key: 'user.id',
            value: 'data.token',
          },
        },
      },
      destinations: {
        spy: {
          before: 'fresh',
          code: { type: 'spy', config: {}, push: async () => {} },
        },
      },
    });

    await elb({ name: 'page view', user: { id: 'p1' }, data: { token: 'P1' } });

    expect(data.get('p1')).toBe('P1');
  });

  it('set runs when a transformer routes via runtime single next', async () => {
    const { code, data } = makeBackedStore();

    const { elb } = await startFlow({
      stores: { kv: { code } },
      transformers: {
        // emitter returns a runtime { next: 'sink' } → dispatch returns early
        // (bypasses the old straight-through set block); its set must still run
        emitter: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'emitter',
            config: ctx.config,
            push(event) {
              return { event, next: 'sink' };
            },
          }),
          state: {
            mode: 'set',
            store: 'kv',
            key: 'user.id',
            value: 'data.token',
          },
        },
        sink: {},
      },
      destinations: {
        spy: {
          before: 'emitter',
          code: { type: 'spy', config: {}, push: async () => {} },
        },
      },
    });

    await elb({ name: 'page view', user: { id: 'n1' }, data: { token: 'N1' } });

    expect(data.get('n1')).toBe('N1');
  });

  it('set runs on each branch of a many fan-out', async () => {
    const { code, data } = makeBackedStore();

    const { elb } = await startFlow({
      transformers: {
        fan: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'fan',
            config: ctx.config,
            push(event) {
              return { event, next: { many: ['ba', 'bb'] } };
            },
          }),
          state: {
            mode: 'set',
            store: 'kv',
            key: 'user.id',
            value: 'data.token',
          },
        },
        ba: {},
        bb: {},
      },
      stores: { kv: { code } },
      destinations: {
        spy: {
          before: 'fan',
          code: { type: 'spy', config: {}, push: async () => {} },
        },
      },
    });

    await elb({ name: 'page view', user: { id: 'm1' }, data: { token: 'M1' } });

    expect(data.get('m1')).toBe('M1');
  });

  it('set runs per fork when a transformer returns a Result[] array', async () => {
    const { code, data } = makeBackedStore();

    const { elb } = await startFlow({
      transformers: {
        splitter: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'splitter',
            config: ctx.config,
            push: async (event) => [
              { event: { ...event, data: { ...event.data, fork: 'a' } } },
              { event: { ...event, data: { ...event.data, fork: 'b' } } },
            ],
          }),
          // set keys by the per-fork `data.fork` value, so both forks must run
          state: {
            mode: 'set',
            store: 'kv',
            key: 'data.fork',
            value: 'data.token',
          },
        },
      },
      stores: { kv: { code } },
      destinations: {
        spy: {
          before: 'splitter',
          code: { type: 'spy', config: {}, push: async () => {} },
        },
      },
    });

    await elb({ name: 'page view', user: { id: 'f1' }, data: { token: 'F1' } });

    // both forks wrote, keyed by their own data.fork
    expect(data.get('a')).toBe('F1');
    expect(data.get('b')).toBe('F1');
  });
});
