import { sourcePubSubPull } from '../index';
import * as examples from '../examples';
import { createMockContext } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { Types, Settings } from '../types';
import type { MessageLike } from '../../shared/types';

// `Settings` import retained for buildContext's partial type below.
import {
  __getMockCalls,
  __resetMockState,
  __setNextCloseHangs,
  __triggerError,
  __triggerMessage,
  MockPubSubConstructor,
  push as pushEnv,
} from '../examples/env';
import { createTrigger } from '../examples/trigger';

interface StepShape {
  in: {
    id: string;
    dataString: string;
    attributes?: Record<string, string>;
    orderingKey?: string;
  };
  out: Array<[string, ...unknown[]]>;
}

function isStepShape(value: unknown): value is StepShape {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: { in?: unknown; out?: unknown } = value;
  return Boolean(candidate.in) && Array.isArray(candidate.out);
}

function buildContext(
  partialSettings: Partial<Settings>,
): Source.Context<Types> {
  const base = createMockContext<Types>({
    config: {
      settings: {
        projectId: 'test-project',
        subscription: 'test-sub',
        ...partialSettings,
      },
    },
    env: pushEnv,
  });
  return {
    ...base,
    id: 'pubsub',
    setIngest: async () => undefined,
    setRespond: () => undefined,
  };
}

describe('Pub/Sub pull source', () => {
  beforeEach(() => {
    __resetMockState();
  });

  it('throws when projectId missing', async () => {
    const context = createMockContext<Types>({
      config: { settings: { subscription: 'sub' } },
      env: pushEnv,
    });
    const fullContext: Source.Context<Types> = {
      ...context,
      id: 'pubsub',
      setIngest: async () => undefined,
      setRespond: () => undefined,
    };
    await expect(sourcePubSubPull(fullContext)).rejects.toThrow(
      'Config settings projectId missing',
    );
  });

  it('throws when subscription missing', async () => {
    const context = createMockContext<Types>({
      config: { settings: { projectId: 'p' } },
      env: pushEnv,
    });
    const fullContext: Source.Context<Types> = {
      ...context,
      id: 'pubsub',
      setIngest: async () => undefined,
      setRespond: () => undefined,
    };
    await expect(sourcePubSubPull(fullContext)).rejects.toThrow(
      'Config settings subscription missing',
    );
  });

  it('uses env-injected PubSub constructor', async () => {
    const ctx = buildContext({});
    const instance = await sourcePubSubPull(ctx);
    expect(instance.type).toBe('pubsub-pull');
    const calls = __getMockCalls();
    expect(calls.some((c) => c.method === 'PubSub.ctor')).toBe(true);
    expect(calls.some((c) => c.method === 'subscription')).toBe(true);
  });

  it('uses pre-supplied settings.client without invoking constructor', async () => {
    const supplied = new MockPubSubConstructor({ projectId: 'pre' });
    __resetMockState();
    const ctx = buildContext({ client: supplied });
    await sourcePubSubPull(ctx);
    const calls = __getMockCalls();
    expect(calls.some((c) => c.method === 'PubSub.ctor')).toBe(false);
    expect(calls.some((c) => c.method === 'subscription')).toBe(true);
  });

  it('destroy closes subscription and client', async () => {
    const ctx = buildContext({});
    const instance = await sourcePubSubPull(ctx);
    if (!instance.destroy) throw new Error('destroy not defined');
    await instance.destroy({
      id: 'pubsub',
      config: instance.config,
      env: pushEnv,
      logger: ctx.logger,
    });
    const calls = __getMockCalls();
    expect(calls.some((c) => c.method === 'subscription.close')).toBe(true);
    expect(calls.some((c) => c.method === 'PubSub.close')).toBe(true);
  });

  it('destroy honors shutdownTimeoutMs when close hangs', async () => {
    __setNextCloseHangs(true);
    const ctx = buildContext({ shutdownTimeoutMs: 50 });
    const instance = await sourcePubSubPull(ctx);
    if (!instance.destroy) throw new Error('destroy not defined');
    const start = Date.now();
    await instance.destroy({
      id: 'pubsub',
      config: instance.config,
      env: pushEnv,
      logger: ctx.logger,
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(elapsed).toBeLessThan(500);
  });

  it('logs canonical hint on PERMISSION_DENIED stream error', async () => {
    const ctx = buildContext({});
    const errorSpy = jest.spyOn(ctx.logger, 'error');
    await sourcePubSubPull(ctx);
    const err: Error & { code?: number } = new Error('denied');
    err.code = 7;
    __triggerError(err);
    expect(errorSpy).toHaveBeenCalled();
    const firstCall = errorSpy.mock.calls[0];
    expect(String(firstCall?.[0])).toContain('walkeros setup source.pubsub');
  });

  it('decodeReturnsNull acks-and-drops via direct trigger', async () => {
    const ctx = buildContext({});
    await sourcePubSubPull(ctx);
    const message: MessageLike = {
      id: 'null-msg',
      data: Buffer.from('null', 'utf8'),
      attributes: {},
      publishTime: new Date(0),
      ack: jest.fn(),
      nack: jest.fn(),
      modAck: jest.fn(),
    };
    const result = __triggerMessage(message);
    if (result instanceof Promise) await result;
    expect(message.ack).toHaveBeenCalledTimes(1);
    expect(message.nack).not.toHaveBeenCalled();
  });

  describe('step examples via createTrigger', () => {
    it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
      if (!isStepShape(rawExample)) {
        throw new Error('example missing in/out shape');
      }
      const example = rawExample;

      // Decoder tests need the source to be configured with the decoder.
      // The trigger boots once with this config.
      const decoderOverride =
        _name === 'decoderText' ? { decoder: 'text' as const } : undefined;
      const errorOverride =
        _name === 'malformedJsonAck'
          ? { onPushError: 'ack' as const }
          : undefined;

      const settings: Partial<Settings> = {
        projectId: 'test',
        subscription: 'sub',
        ...(decoderOverride ?? {}),
        ...(errorOverride ?? {}),
      };

      const { trigger } = await createTrigger({
        sources: {
          pubsub: {
            code: sourcePubSubPull,
            config: { settings },
            env: pushEnv,
          },
        },
      });

      const result = await trigger()(example.in);

      // Filter to only ack/nack records for these examples.
      const filtered = result.filter(
        ([method]) => method === 'message.ack' || method === 'message.nack',
      );
      expect(filtered).toEqual(example.out);
    });
  });
});
