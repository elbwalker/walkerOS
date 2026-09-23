import { startFlow } from '..';
import { Source } from '@walkeros/core';
import type { Collector, Elb, Transformer, WalkerOS } from '@walkeros/core';

type TestSourceTypes = Source.Types<unknown, unknown, Source.Push>;

/**
 * A before-chain step that lifts a site id into ingest, as a server source's
 * `config.ingest` would for a real request.
 */
const tagger: Transformer.InitTransformer = {
  code: async (ctx) => ({
    type: 'tagger',
    config: ctx.config,
    push(event, context) {
      context.ingest.site = 'acme';
      return { event };
    },
  }),
};

/**
 * Integration tests for the declarative `state` block on source steps.
 *
 * Chain order: before → state[get] → state[set] → collector.push. Both get
 * and set run before the collector receives the event.
 */
describe('Source state integration', () => {
  it('get-before-collector enriches the event the collector receives', async () => {
    const destinationEvents: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      sources: {
        seeder: {
          code: async (context): Promise<Source.Instance<TestSourceTypes>> => ({
            type: 'seeder',
            config: context.config as Source.Config<TestSourceTypes>,
            push: context.env.push,
          }),
          // stash data.token under user.id
          config: {
            state: {
              mode: 'set',
              key: 'event.user.id',
              value: 'event.data.token',
            },
          },
        },
        reader: {
          primary: true,
          code: async (context): Promise<Source.Instance<TestSourceTypes>> => ({
            type: 'reader',
            config: context.config as Source.Config<TestSourceTypes>,
            push: context.env.push,
          }),
          // get the stored token onto data.fetched before the collector sees it
          config: {
            state: {
              mode: 'get',
              key: 'event.user.id',
              value: 'event.data.fetched',
            },
          },
        },
      },
      destinations: {
        spy: {
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

    // First push through the seeder source stashes the token
    await collector.sources.seeder.push({
      name: 'page view',
      user: { id: 'u1' },
      data: { token: 'TOK1' },
    });

    // Second push through the reader (primary) source: its get enriches the
    // event before the collector/destination see it
    await collector.sources.reader.push({
      name: 'page view',
      user: { id: 'u1' },
      data: {},
    });

    const readerEvent = destinationEvents.find(
      (event) => event.data?.fetched !== undefined,
    );
    expect(readerEvent?.data?.fetched).toBe('TOK1');
  });

  it('skips source state when a terminus is present', async () => {
    const spyEvents: WalkerOS.DeepPartialEvent[] = [];
    const spyPush: Collector.PushFn = async (event) => {
      spyEvents.push(event as WalkerOS.DeepPartialEvent);
      return { ok: true } as Elb.PushResult;
    };

    const { collector } = await startFlow({
      sources: {
        s1: {
          primary: true,
          code: async (context): Promise<Source.Instance<TestSourceTypes>> => ({
            type: 's1',
            config: context.config as Source.Config<TestSourceTypes>,
            push: context.env.push,
          }),
          terminus: spyPush,
          // would enrich data.fetched if state ran; with a terminus it must not
          config: {
            state: [
              { mode: 'set', key: 'event.user.id', value: 'event.data.token' },
              {
                mode: 'get',
                key: 'event.user.id',
                value: 'event.data.fetched',
              },
            ],
          },
        },
      },
    });

    await collector.sources.s1.push({
      name: 'page view',
      user: { id: 'u3' },
      data: { token: 'TOK3' },
    });

    expect(spyEvents).toHaveLength(1);
    // raw event: state did not enrich data.fetched
    expect(spyEvents[0]?.data?.fetched).toBeUndefined();
    expect(spyEvents[0]?.data?.token).toBe('TOK3');
  });

  it('set-after stashes from the event for a later read', async () => {
    const destinationEvents: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      sources: {
        s1: {
          primary: true,
          code: async (context): Promise<Source.Instance<TestSourceTypes>> => ({
            type: 's1',
            config: context.config as Source.Config<TestSourceTypes>,
            push: context.env.push,
          }),
          config: {
            state: [
              { mode: 'set', key: 'event.user.id', value: 'event.data.token' },
              { mode: 'get', key: 'event.user.id', value: 'event.data.echo' },
            ],
          },
        },
      },
      destinations: {
        spy: {
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

    await collector.sources.s1.push({
      name: 'page view',
      user: { id: 'u2' },
      data: { token: 'TOK2' },
    });

    expect(destinationEvents).toHaveLength(1);
    // set ran (stashed TOK2), then get read it back onto data.echo
    expect(destinationEvents[0].data?.echo).toBe('TOK2');
  });

  it('keys state off an ingest value lifted by the before chain', async () => {
    const destinationEvents: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      sources: {
        s1: {
          primary: true,
          before: 'tagger',
          code: async (context): Promise<Source.Instance<TestSourceTypes>> => ({
            type: 's1',
            config: context.config as Source.Config<TestSourceTypes>,
            push: context.env.push,
          }),
          config: {
            state: [
              { mode: 'set', key: 'ingest.site', value: 'event.data.token' },
              { mode: 'get', key: 'ingest.site', value: 'event.data.echo' },
            ],
          },
        },
      },
      transformers: { tagger },
      destinations: {
        spy: {
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

    await collector.sources.s1.push({
      name: 'page view',
      data: { token: 'TOK4' },
    });

    expect(destinationEvents[0].data?.echo).toBe('TOK4');
  });
});
