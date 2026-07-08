import { Source } from '@walkeros/core';
import type { FlowState, Ingest, Transformer, WalkerOS } from '@walkeros/core';
import { startFlow } from '..';

const VALID = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
const TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';
const SPAN = '00f067aa0ba902b7';

type ServerPush = (raw: unknown) => Promise<void>;
type ServerTypes = Source.Types<unknown, unknown, ServerPush>;

/**
 * Drive a real source scope with `rawData` and return the Ingest a
 * downstream transformer observes. Exercises `extractIngest` via the
 * genuine `withScope` pipeline rather than reaching into the closure.
 */
async function captureScopeIngest(rawData: unknown): Promise<Ingest> {
  let captured: Ingest | undefined;

  const { collector } = await startFlow({
    sources: {
      server: {
        next: 'spy',
        code: async (context): Promise<Source.Instance<ServerTypes>> => {
          const push: ServerPush = async (raw) => {
            await context.withScope(raw, undefined, async (env) => {
              await env.push({ name: 'page view', data: {} });
            });
          };
          return { type: 'server', config: {}, push };
        },
      },
    },
    transformers: {
      spy: {
        code: async (context): Promise<Transformer.Instance> => ({
          type: 'spy',
          config: context.config,
          push: async (event, ctx) => {
            captured = ctx.ingest;
            return { event };
          },
        }),
      },
    },
    destinations: {
      d: { code: { type: 'test', config: {}, push: async () => {} } },
    },
  });

  const source = Source.getSource<ServerTypes>(collector, 'server');
  await source.push(rawData);

  if (!captured) throw new Error('ingest was not captured');
  return captured;
}

describe('extractIngest traceparent adoption', () => {
  it('stamps trace + parentEventId from plain-object headers', async () => {
    const ingest = await captureScopeIngest({
      headers: { traceparent: VALID },
    });
    expect(ingest._meta.trace).toBe(TRACE);
    expect(ingest._meta.parentEventId).toBe(SPAN);
  });

  it('stamps trace + parentEventId from a Fetch Headers instance', async () => {
    const headers = new Headers({ traceparent: VALID });
    const ingest = await captureScopeIngest({ headers });
    expect(ingest._meta.trace).toBe(TRACE);
    expect(ingest._meta.parentEventId).toBe(SPAN);
  });

  it('finds an uppercase header key via case-insensitive fallback', async () => {
    const ingest = await captureScopeIngest({
      headers: { Traceparent: VALID },
    });
    expect(ingest._meta.trace).toBe(TRACE);
    expect(ingest._meta.parentEventId).toBe(SPAN);
  });

  it('leaves _meta untouched for an invalid traceparent value', async () => {
    const ingest = await captureScopeIngest({
      headers: { traceparent: 'not-a-valid-traceparent' },
    });
    expect(ingest._meta.trace).toBeUndefined();
    expect(ingest._meta.parentEventId).toBeUndefined();
  });

  it('leaves _meta untouched when no headers are present', async () => {
    const ingest = await captureScopeIngest({ ip: '1.2.3.4' });
    expect(ingest._meta.trace).toBeUndefined();
    expect(ingest._meta.parentEventId).toBeUndefined();
  });

  it('propagates the adopted trace onto every FlowState record end-to-end', async () => {
    const states: FlowState[] = [];
    const pushed: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      run: true,
      sources: {
        server: {
          next: 'tagger',
          code: async (context): Promise<Source.Instance<ServerTypes>> => {
            const push: ServerPush = async (raw) => {
              await context.withScope(raw, undefined, async (env) => {
                await env.push({ name: 'page view', data: {} });
              });
            };
            return { type: 'server', config: {}, push };
          },
        },
      },
      transformers: {
        tagger: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'tagger',
            config: context.config,
            push: async (event) => ({ event }),
          }),
        },
      },
      destinations: {
        collect: {
          code: {
            type: 'collect',
            config: {},
            push: async (event: WalkerOS.Event) => {
              pushed.push(event);
            },
          },
        },
      },
    });
    collector.observers.add((state) => states.push(state));

    const source = Source.getSource<ServerTypes>(collector, 'server');
    await source.push({ headers: { traceparent: VALID } });

    // The created event adopts the header-derived trace.
    expect(pushed[0]?.source.trace).toBe(TRACE);

    const pick = (stepId: string): FlowState | undefined =>
      states.find((s) => s.stepId === stepId && s.phase === 'in');

    for (const stepId of [
      'collector.push',
      'transformer.tagger',
      'destination.collect',
    ]) {
      expect(pick(stepId)?.traceId).toBe(TRACE);
      expect(pick(stepId)?.parentEventId).toBe(SPAN);
    }
  });
});
