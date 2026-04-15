import { startFlow } from '..';
import type {
  Destination,
  Mapping,
  RespondFn,
  RespondOptions,
  Source,
  WalkerOS,
} from '@walkeros/core';
import { createRespond } from '@walkeros/core';

/**
 * Simulates a file transformer on cache MISS: calls respond with the
 * "real" response body. This is the step whose output MUST win.
 */
function createFileLikeResponder(responseBody: string): Destination.Instance {
  return {
    type: 'file-like',
    config: {},
    push: async (_event: WalkerOS.Event, context: Destination.PushContext) => {
      const respond = context.env?.respond as RespondFn | undefined;
      respond?.({
        body: responseBody,
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      });
    },
  };
}

// fn with a real macrotask delay forces applyUpdate's inner await to park on
// a setTimeout(30) timer. The MISS wrapper's fire-and-forget
// `applyUpdate(...).then(...)` cannot resolve until that timer fires, which
// gives the synchronous unwind path (destination push -> collector.push ->
// wrappedPush -> `await env.push` in the source) a window to run the
// source's fallback respond first. With createRespond's first-call-wins
// semantics the fallback body would lock in and the real body would be lost.
// The fix is to capture the pending promise in wrappedPush and await it
// before returning control to the source.
const delayedMissFn: Mapping.Fn = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 30));
  return 'MISS';
};

describe('Source cache MISS race (collector)', () => {
  // The shared web jest setup installs fake timers per test via
  // jest.useFakeTimers() in beforeEach. This test intentionally uses
  // setTimeout inside delayedMissFn to create a real macrotask delay, so
  // we switch back to real timers for the scope of this test.
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('should not let source fallback respond win on first MISS with update rule', async () => {
    // Captures every final respond seen by the source's sender.
    // Using createRespond here mirrors the express source's first-call-wins
    // semantics - if the fallback GIF locks in first, we see it here.
    const senderCalls: RespondOptions[] = [];

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => {
            const { env, config, setIngest, setRespond } = context;
            return {
              type: 'test',
              config: config as Source.Config,
              push: async (rawData: unknown) => {
                await setIngest(rawData);

                // Create an idempotent respond backed by a simple sender,
                // exactly like a real HTTP source would.
                const respond = createRespond((options) => {
                  senderCalls.push(options);
                });
                setRespond(respond);

                // Dispatch into the collector pipeline. The responder
                // destination calls respond(fileBody) via env.respond.
                const pushResult = await env.push({
                  name: 'page view',
                  data: {},
                });

                // Source fallback: this mirrors the express source's
                // transparent-GIF default. It runs AFTER env.push
                // resolves and must not overwrite the responder's body.
                respond({
                  body: 'FALLBACK',
                  headers: { 'Content-Type': 'image/gif' },
                });

                return pushResult;
              },
            };
          },
          cache: {
            // full: true is the default for sources. MISS with update rule
            // forces the async applyUpdate path inside the MISS wrapper.
            rules: [
              {
                match: {
                  key: 'ingest.method',
                  operator: 'eq',
                  value: 'GET',
                },
                key: ['ingest.method', 'ingest.path'],
                ttl: 300,
                update: {
                  'headers.X-Cache': { fn: delayedMissFn },
                },
              },
            ],
          },
          config: {
            ingest: {
              map: { method: { key: 'method' }, path: { key: 'path' } },
            },
          },
        },
      },
      destinations: {
        responder: {
          code: createFileLikeResponder('real file body'),
        },
      },
    });

    const testSourcePush = collector.sources.testSource.push as (
      rawData: unknown,
    ) => Promise<unknown>;
    await testSourcePush({
      method: 'GET',
      path: '/walker.js',
    });

    // Exactly one response was sent to the sender (first-call-wins).
    expect(senderCalls).toHaveLength(1);

    // The winning response MUST be the file body, not the fallback GIF.
    // The X-Cache: MISS header proves the MISS wrapper's applyUpdate
    // completed and fed its result into respond before wrappedPush
    // returned control to the source.
    expect(senderCalls[0].body).toBe('real file body');
    expect(senderCalls[0].headers).toEqual({
      'Content-Type': 'application/javascript',
      'X-Cache': 'MISS',
    });
  });
});
