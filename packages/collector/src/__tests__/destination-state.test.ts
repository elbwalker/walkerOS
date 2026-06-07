import { startFlow } from '..';
import type { Destination, Store, WalkerOS } from '@walkeros/core';

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
 * Integration tests for the declarative `state` block on destination steps.
 *
 * Chain order: state[get] → mapping-to-payload push → state[set] (after a
 * successful send).
 */
describe('Destination state integration', () => {
  it('get-before-payload affects the pushed payload', async () => {
    const pushedA: WalkerOS.Event[] = [];
    const pushedB: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      destinations: {
        // seeds the store: stash data.token under user.id after sending
        seeder: {
          code: {
            type: 'seeder',
            config: {},
            push: async (event: WalkerOS.Event) => {
              pushedA.push(event);
            },
          },
          state: { mode: 'set', key: 'user.id', value: 'data.token' },
        },
        // reads the store before its own push: enrich data.fetched
        reader: {
          code: {
            type: 'reader',
            config: {},
            push: async (event: WalkerOS.Event) => {
              pushedB.push(event);
            },
          },
          state: { mode: 'get', key: 'user.id', value: 'data.fetched' },
        },
      },
    });

    // First event seeds the store
    await elb({ name: 'page view', user: { id: 'u1' }, data: { token: 'D1' } });
    // Second event: reader's get enriches the pushed payload
    await elb({ name: 'page view', user: { id: 'u1' }, data: {} });

    const enriched = pushedB.find((event) => event.data?.fetched !== undefined);
    expect(enriched?.data?.fetched).toBe('D1');
  });

  it('set-after-send stashes the event for a later read', async () => {
    const pushed: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      destinations: {
        stasher: {
          code: {
            type: 'stasher',
            config: {},
            push: async () => undefined,
          },
          state: { mode: 'set', key: 'user.id', value: 'data.token' },
        },
        verifier: {
          code: {
            type: 'verifier',
            config: {},
            push: async (event: WalkerOS.Event) => {
              pushed.push(event);
            },
          },
          state: { mode: 'get', key: 'user.id', value: 'data.verified' },
        },
      },
    });

    // First event: stasher writes after send
    await elb({ name: 'page view', user: { id: 'u2' }, data: { token: 'D2' } });
    // Second event: verifier reads the stashed value
    await elb({ name: 'page view', user: { id: 'u2' }, data: {} });

    const verified = pushed.find((event) => event.data?.verified !== undefined);
    expect(verified?.data?.verified).toBe('D2');
  });

  it('get miss leaves the event unchanged', async () => {
    const pushed: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      destinations: {
        reader: {
          code: {
            type: 'reader',
            config: {},
            push: async (event: WalkerOS.Event) => {
              pushed.push(event);
            },
          },
          state: { mode: 'get', key: 'user.id', value: 'data.fetched' },
        },
      },
    });

    await elb({ name: 'page view', user: { id: 'missing' }, data: {} });

    expect(pushed).toHaveLength(1);
    expect(pushed[0].data?.fetched).toBeUndefined();
  });

  it('does not write state[set] on a batched-enqueue (only a real send writes)', async () => {
    const { code, data } = makeBackedStore();
    const dest: Destination.Instance = {
      type: 'batched',
      push: async () => undefined,
      pushBatch: async () => undefined,
      config: {
        // high wait + size cap so a single event stays enqueued (no flush)
        batch: { wait: 60_000, size: 50 },
        mapping: { '*': { '*': { batch: 1 } } },
        state: {
          mode: 'set',
          store: 'kv',
          key: 'user.id',
          value: 'data.token',
        },
      },
    };

    const { elb } = await startFlow({
      stores: { kv: { code } },
      destinations: { batchDest: { code: dest } },
    });

    await elb({ name: 'page view', user: { id: 'b1' }, data: { token: 'B1' } });

    // event was enqueued, not delivered: set must NOT have written
    expect(data.has('b1')).toBe(false);
  });

  it('writes state[set] on a non-batched successful send (regression)', async () => {
    const { code, data } = makeBackedStore();

    const { elb } = await startFlow({
      stores: { kv: { code } },
      destinations: {
        stasher: {
          code: {
            type: 'stasher',
            config: {},
            push: async () => undefined,
          },
          state: {
            mode: 'set',
            store: 'kv',
            key: 'user.id',
            value: 'data.token',
          },
        },
      },
    });

    await elb({ name: 'page view', user: { id: 'b2' }, data: { token: 'B2' } });

    expect(data.get('b2')).toBe('B2');
  });
});
