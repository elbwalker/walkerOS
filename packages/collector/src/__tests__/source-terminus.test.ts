import { startFlow } from '..';
import { Source } from '@walkeros/core';
import type { Collector, Elb, WalkerOS } from '@walkeros/core';

// `Source.Types` defaults `env` to `BaseEnv`, which is what these tests read.
// The push signature is `Collector.PushFn` because these sources emit through
// the collector-provided `env.push` verbatim.
type TestSourceTypes = Source.Types<unknown, unknown, Collector.PushFn>;

/** Inline source whose push is the collector-provided env.push. */
const emitSource = async (
  context: Source.Context<TestSourceTypes>,
): Promise<Source.Instance<TestSourceTypes>> => ({
  type: 'emit',
  config: context.config as Source.Config<TestSourceTypes>,
  push: context.env.push,
});

describe('InitSource.terminus', () => {
  test('a terminus receives the raw event and the whole pipeline is skipped', async () => {
    const seen: WalkerOS.DeepPartialEvent[] = [];
    const chainSaw: string[] = [];
    const terminus: Collector.PushFn = async (event) => {
      seen.push(event);
      return { ok: true };
    };

    const { collector } = await startFlow({
      sources: {
        s1: {
          code: emitSource,
          terminus,
          next: 'tap',
          config: {
            state: [{ mode: 'set', key: 'user.id', value: 'data.token' }],
          },
        },
      },
      transformers: {
        tap: {
          code: async (context) => ({
            type: 'tap',
            config: context.config,
            push: async (event) => {
              chainSaw.push(event.name ?? '');
              return { event };
            },
          }),
        },
      },
    });

    await collector.sources.s1.push({ name: 'promotion start', data: {} });

    // Raw: no minted span id, no enrichment, exactly what the caller wrote.
    expect(seen).toEqual([{ name: 'promotion start', data: {} }]);
    // Total bypass: the next chain did not run...
    expect(chainSaw).toEqual([]);
    // ...and state did not run either.
    expect(collector.user.id).toBeUndefined();
  });

  test('without a terminus the full pipeline runs', async () => {
    const chainSaw: string[] = [];
    const delivered: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      sources: { s1: { code: emitSource, next: 'tap' } },
      transformers: {
        tap: {
          code: async (context) => ({
            type: 'tap',
            config: context.config,
            push: async (event) => {
              chainSaw.push(event.name ?? '');
              return { event };
            },
          }),
        },
      },
      destinations: {
        cap: {
          code: {
            type: 'capture',
            config: {},
            push: (event: WalkerOS.Event) => {
              delivered.push(event);
            },
          },
        },
      },
    });

    await collector.sources.s1.push({ name: 'promotion start', data: {} });

    expect(chainSaw).toEqual(['promotion start']);
    expect(delivered).toHaveLength(1);
    // The pipeline mints a span id.
    expect(delivered[0].id).toBeTruthy();
  });
});

describe('runtime capability ownership in source env', () => {
  test('author values for the five capability keys are ignored, uniformly', async () => {
    const authorPush: Collector.PushFn = jest.fn(async () => ({ ok: true }));
    const authorCommand: Collector.CommandFn = jest.fn(async () => ({
      ok: true,
    }));
    const authorElb: Elb.Fn = jest.fn(async () => ({ ok: true }));

    const captured: WalkerOS.Event[] = [];
    let observedEnv: Source.BaseEnv | undefined;

    const { collector } = await startFlow({
      sources: {
        s1: {
          code: async (context: Source.Context<TestSourceTypes>) => {
            observedEnv = context.env;
            return {
              type: 'emit',
              config: context.config as Source.Config<TestSourceTypes>,
              push: context.env.push,
            };
          },
          env: {
            push: authorPush,
            command: authorCommand,
            elb: authorElb,
            // A real dependency, which MUST survive.
            marker: 'kept',
          },
        },
      },
      destinations: {
        cap: {
          code: {
            type: 'capture',
            config: {},
            push: (event: WalkerOS.Event) => {
              captured.push(event);
            },
          },
        },
      },
    });

    await collector.sources.s1.push({ name: 'promotion start', data: {} });

    // The event took the real pipeline, not the author's push.
    expect(authorPush).not.toHaveBeenCalled();
    expect(captured).toHaveLength(1);
    // The other capability keys are the collector's, not the author's.
    expect(observedEnv?.command).toBe(collector.command);
    expect(observedEnv?.elb).toBe(collector.elb);
    // Author dependencies are untouched.
    expect(observedEnv?.marker).toBe('kept');
  });
});
