import { startFlow } from '..';
import type { WalkerOS } from '@walkeros/core';

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
});
