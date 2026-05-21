import { startFlow } from '..';
import { Source } from '@walkeros/core';
import type {
  Ingest,
  RespondFn,
  RespondOptions,
  Transformer,
} from '@walkeros/core';

/**
 * Adversarial concurrency stress: 100 interleaved withScope invocations
 * must each carry their own ingest and respond all the way through the
 * pipeline without crosstalk. Reproduces PROD-001: before withScope the
 * source-factory closure variables `currentIngest` and `currentRespond`
 * got stomped by request N+1 mid-flight through request N.
 *
 * Deliberate microtask split in the spy transformer forces interleaving.
 * The destination calls respond with the request's own id; the test
 * asserts that every request's respond received exactly its own id back.
 */
describe('Source concurrent requests', () => {
  it('keeps ingest and respond isolated across 100 interleaved scopes', async () => {
    const N = 100;
    const respondById: Record<number, RespondOptions[]> = {};
    const ingestByRequestId: Record<number, Ingest> = {};
    for (let i = 0; i < N; i++) respondById[i] = [];

    type RawRequest = { id: number };
    type ScopeSimulate = (raw: RawRequest) => Promise<void>;
    type TestSourceTypes = Source.Types<unknown, unknown, ScopeSimulate>;

    const { collector } = await startFlow({
      sources: {
        testSource: {
          config: {
            ingest: { map: { requestId: 'id' } },
          },
          next: 'interleave',
          code: async (context): Promise<Source.Instance<TestSourceTypes>> => {
            const simulate: ScopeSimulate = async (raw) => {
              const respond: RespondFn = (options = {}) => {
                respondById[raw.id].push(options);
              };
              await context.withScope(raw, respond, async (env) => {
                await env.push({
                  name: 'page view',
                  data: { id: raw.id },
                });
              });
            };
            return {
              type: 'test',
              config: context.config as Source.Config<TestSourceTypes>,
              push: simulate,
            };
          },
        },
      },
      transformers: {
        interleave: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'interleave',
            config: context.config,
            push: async (event, ctx) => {
              // Deliberate microtask split — yield twice plus a setTimeout(0)
              // macrotask to maximize interleaving between concurrent scopes.
              await Promise.resolve();
              await Promise.resolve();
              await new Promise<void>((r) => setTimeout(r, 0));
              const id = ctx.ingest.requestId as number;
              ingestByRequestId[id] = ctx.ingest;
              return { event };
            },
          }),
        },
      },
      destinations: {
        echo: {
          code: {
            type: 'echo',
            config: {},
            push: async (_event, dctx) => {
              const respond = dctx.env?.respond as RespondFn | undefined;
              const ingest = dctx.ingest as Ingest;
              respond?.({ body: { echoedId: ingest.requestId } });
            },
          },
        },
      },
    });

    // beforeEach in the shared jest setup installs fake timers; this test
    // uses a real setTimeout inside the transformer for interleaving.
    jest.useRealTimers();

    const testSource = Source.getSource<TestSourceTypes>(
      collector,
      'testSource',
    );

    // Fire all 100 concurrently. Promise.all interleaves naturally via the
    // event loop; the transformer's microtask+macrotask split ensures every
    // scope must yield mid-pipeline.
    await Promise.all(
      Array.from({ length: N }, (_, id) => testSource.push({ id })),
    );

    // Every request observed its own ingest at the transformer hop.
    for (let id = 0; id < N; id++) {
      expect(ingestByRequestId[id]).toBeDefined();
      expect(ingestByRequestId[id].requestId).toBe(id);
    }

    // Every request's respond was called exactly once with its own id.
    for (let id = 0; id < N; id++) {
      expect(respondById[id]).toHaveLength(1);
      expect((respondById[id][0].body as { echoedId: number }).echoedId).toBe(
        id,
      );
    }
  });
});
