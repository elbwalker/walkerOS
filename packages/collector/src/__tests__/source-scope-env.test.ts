import { startFlow } from '..';
import { Source } from '@walkeros/core';
import type {
  Ingest,
  RespondFn,
  RespondOptions,
  Transformer,
} from '@walkeros/core';

/**
 * Per-scope env regression: `context.withScope` must build a fresh
 * Ingest + respond per call and the per-scope `env.push` must thread
 * both all the way through the collector pipeline.
 *
 * Two concurrent withScope calls deliberately interleave inside a spy
 * transformer (microtask split). The spy captures `ctx.ingest` for each
 * event. Each scope's respond gets the cached output for its own scope only.
 */
describe('Source.Context.withScope per-scope binding', () => {
  it('does not crosstalk ingest or respond between concurrent scopes', async () => {
    const capturedByIngestId: Record<string, Ingest> = {};
    const respondCallsByScope: Record<string, RespondOptions[]> = {
      A: [],
      B: [],
    };

    type ScopePush = (raw: {
      scope: 'A' | 'B';
      value: string;
    }) => Promise<void>;
    type TestSourceTypes = Source.Types<unknown, unknown, ScopePush>;

    const { collector } = await startFlow({
      sources: {
        testSource: {
          config: {
            ingest: { map: { scope: 'scope', value: 'value' } },
          },
          next: 'spy',
          code: async (context): Promise<Source.Instance<TestSourceTypes>> => {
            const scopePush: ScopePush = async (raw) => {
              const respond: RespondFn = (options = {}) => {
                respondCallsByScope[raw.scope].push(options);
              };
              await context.withScope(raw, respond, async (env) => {
                // Sanity check: env carries the right ingest.
                expect(env.ingest.scope).toBe(raw.scope);
                expect(env.respond).toBe(respond);
                await env.push({
                  name: 'page view',
                  data: { scope: raw.scope, value: raw.value },
                });
                // Per-scope respond is called by the destination via env.respond.
              });
            };

            return {
              type: 'test',
              config: context.config as Source.Config<TestSourceTypes>,
              push: scopePush,
            };
          },
        },
      },
      transformers: {
        spy: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'spy',
            config: context.config,
            push: async (event, ctx) => {
              // Force microtask interleaving: yield, then read ingest.
              await Promise.resolve();
              await Promise.resolve();
              const scope = ctx.ingest.scope as string;
              // Capture ingest under the per-scope value seen at this hop.
              capturedByIngestId[scope] = ctx.ingest;
              return { event };
            },
          }),
        },
      },
      destinations: {
        respondCapture: {
          code: {
            type: 'respond-capture',
            config: {},
            push: async (_event, context) => {
              const respond = context.env?.respond as RespondFn | undefined;
              const ingest = context.ingest as Ingest;
              const scope = ingest.scope as 'A' | 'B';
              respond?.({ body: { scope } });
            },
          },
        },
      },
    });

    const testSource = Source.getSource<TestSourceTypes>(
      collector,
      'testSource',
    );
    const pushA = testSource.push({
      scope: 'A',
      value: 'alpha',
    });
    const pushB = testSource.push({
      scope: 'B',
      value: 'beta',
    });

    await Promise.all([pushA, pushB]);

    // Each scope's ingest stayed bound to its own value.
    expect(capturedByIngestId.A.value).toBe('alpha');
    expect(capturedByIngestId.B.value).toBe('beta');

    // Each scope's respond got exactly one call with its own scope id.
    expect(respondCallsByScope.A).toHaveLength(1);
    expect(respondCallsByScope.B).toHaveLength(1);
    expect((respondCallsByScope.A[0].body as { scope: string }).scope).toBe(
      'A',
    );
    expect((respondCallsByScope.B[0].body as { scope: string }).scope).toBe(
      'B',
    );
  });
});
