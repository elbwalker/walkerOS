jest.mock('@google-cloud/pubsub');

import { PubSub } from '@google-cloud/pubsub';
import {
  __getMockCalls,
  __resetMockCalls,
  __setSubscriptionHarness,
  __triggerError,
} from '@google-cloud/pubsub';
import { sourcePubSubPull } from '../index';
import * as examples from '../examples';
import { createIngest, createMockContext } from '@walkeros/core';
import type { Ingest, Source } from '@walkeros/core';
import type { Settings, SyntheticMessage, Types } from '../types';
import { push as pushEnv } from '../examples/env';
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
    withScope: async (_r, respond, body) =>
      body({
        ...pushEnv,
        push: pushEnv.push,
        ingest: createIngest('pubsub') as Ingest,
        respond,
      } as never),
  };
}

describe('Pub/Sub pull source', () => {
  beforeEach(() => {
    __resetMockCalls();
  });

  it('throws when projectId missing', async () => {
    const context = createMockContext<Types>({
      config: { settings: { subscription: 'sub' } },
      env: pushEnv,
    });
    const fullContext: Source.Context<Types> = {
      ...context,
      id: 'pubsub',
      withScope: async (_r, respond, body) =>
        body({
          ...pushEnv,
          push: pushEnv.push,
          ingest: createIngest('pubsub') as Ingest,
          respond,
        } as never),
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
      withScope: async (_r, respond, body) =>
        body({
          ...pushEnv,
          push: pushEnv.push,
          ingest: createIngest('pubsub') as Ingest,
          respond,
        } as never),
    };
    await expect(sourcePubSubPull(fullContext)).rejects.toThrow(
      'Config settings subscription missing',
    );
  });

  it('uses env-injected PubSub constructor', async () => {
    const ctx = buildContext({});
    const instance = await sourcePubSubPull(ctx);
    expect(instance.type).toBe('pubsub-pull');
    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).toContain('PubSub.ctor');
    expect(methods).toContain('subscription');
  });

  it('uses pre-supplied settings.client without invoking constructor', async () => {
    const supplied = new PubSub({ projectId: 'pre' });
    __resetMockCalls();
    const ctx = buildContext({ client: supplied });
    await sourcePubSubPull(ctx);
    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).not.toContain('PubSub.ctor');
    expect(methods).toContain('subscription');
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
    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).toContain('subscription.close');
    expect(methods).toContain('PubSub.close');
  });

  it('destroy honors shutdownTimeoutMs when close hangs', async () => {
    __setSubscriptionHarness({ closeHangs: true });
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

  it('decodeReturnsNull acks-and-drops via synthetic push', async () => {
    const ctx = buildContext({});
    const instance = await sourcePubSubPull(ctx);
    const synthetic: SyntheticMessage = {
      id: 'null-msg',
      data: Buffer.from('null', 'utf8'),
    };
    const result = await instance.push(synthetic);
    expect(result).toBeDefined();
    if (!result || typeof result !== 'object') {
      throw new Error('expected SyntheticPushResult');
    }
    expect(result.acked).toBe(true);
    expect(result.nacked).toBe(false);
  });

  it('synthetic push without content is a no-op', async () => {
    const ctx = buildContext({});
    const instance = await sourcePubSubPull(ctx);
    const result = await instance.push();
    expect(result).toBeUndefined();
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
