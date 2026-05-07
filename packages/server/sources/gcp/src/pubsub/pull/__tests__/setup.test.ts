import { sourcePubSubPull } from '../index';
import { createMockContext, createMockLogger } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { Types } from '../types';
import {
  __getMockCalls,
  __resetMockState,
  __setNextCreateError,
  __setNextSubscriptionMetadata,
  __setTopicCreateError,
  __setTopicExists,
  push as pushEnv,
} from '../examples/env';

function buildContext(
  config: Partial<Source.Config<Types>>,
): Source.Context<Types> {
  const base = createMockContext<Types>({
    config: {
      ...config,
      settings: {
        projectId: 'test-project',
        subscription: 'test-sub',
        topic: 'events',
        ...(config.settings ?? {}),
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

interface SetupResultShape {
  topicCreated: boolean;
  deadLetterTopicCreated: boolean;
  subscriptionCreated: boolean;
}

function isSetupResult(value: unknown): value is SetupResultShape {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: {
    topicCreated?: unknown;
    deadLetterTopicCreated?: unknown;
    subscriptionCreated?: unknown;
  } = value;
  return (
    typeof candidate.topicCreated === 'boolean' &&
    typeof candidate.deadLetterTopicCreated === 'boolean' &&
    typeof candidate.subscriptionCreated === 'boolean'
  );
}

describe('Pub/Sub pull source setup', () => {
  beforeEach(() => {
    __resetMockState();
  });

  it('skips when config.setup is undefined', async () => {
    const ctx = buildContext({});
    const instance = await sourcePubSubPull(ctx);
    if (!instance.setup) throw new Error('setup not defined');
    const result = await instance.setup({
      id: 'pubsub',
      config: instance.config,
      env: pushEnv,
      logger: ctx.logger,
    });
    expect(result).toBeUndefined();
  });

  it('skips when config.setup is false', async () => {
    const ctx = buildContext({ setup: false });
    const instance = await sourcePubSubPull(ctx);
    if (!instance.setup) throw new Error('setup not defined');
    const result = await instance.setup({
      id: 'pubsub',
      config: instance.config,
      env: pushEnv,
      logger: ctx.logger,
    });
    expect(result).toBeUndefined();
  });

  it('creates subscription when setup: true', async () => {
    const ctx = buildContext({ setup: true });
    const instance = await sourcePubSubPull(ctx);
    if (!instance.setup) throw new Error('setup not defined');
    const result = await instance.setup({
      id: 'pubsub',
      config: instance.config,
      env: pushEnv,
      logger: ctx.logger,
    });
    expect(isSetupResult(result)).toBe(true);
    if (!isSetupResult(result)) throw new Error('not a SetupResult');
    expect(result.subscriptionCreated).toBe(true);
    expect(result.topicCreated).toBe(false);
    const calls = __getMockCalls();
    expect(calls.some((c) => c.method === 'PubSub.createSubscription')).toBe(
      true,
    );
  });

  it('creates topic when createTopic: true and topic does not exist', async () => {
    __setTopicExists('events', false);
    const ctx = buildContext({ setup: { createTopic: true } });
    const instance = await sourcePubSubPull(ctx);
    if (!instance.setup) throw new Error('setup not defined');
    const result = await instance.setup({
      id: 'pubsub',
      config: instance.config,
      env: pushEnv,
      logger: ctx.logger,
    });
    if (!isSetupResult(result)) throw new Error('not a SetupResult');
    expect(result.topicCreated).toBe(true);
  });

  it('creates dead-letter topic when createDeadLetterTopic: true', async () => {
    __setTopicExists('dlq', false);
    const ctx = buildContext({
      setup: {
        deadLetterPolicy: {
          deadLetterTopic: 'dlq',
          maxDeliveryAttempts: 5,
          createDeadLetterTopic: true,
        },
      },
    });
    const instance = await sourcePubSubPull(ctx);
    if (!instance.setup) throw new Error('setup not defined');
    const result = await instance.setup({
      id: 'pubsub',
      config: instance.config,
      env: pushEnv,
      logger: ctx.logger,
    });
    if (!isSetupResult(result)) throw new Error('not a SetupResult');
    expect(result.deadLetterTopicCreated).toBe(true);
  });

  it('idempotent on ALREADY_EXISTS for subscription', async () => {
    const alreadyExists: Error & { code?: number } = new Error('already');
    alreadyExists.code = 6;
    __setNextCreateError(alreadyExists);
    const ctx = buildContext({ setup: true });
    const instance = await sourcePubSubPull(ctx);
    if (!instance.setup) throw new Error('setup not defined');
    const result = await instance.setup({
      id: 'pubsub',
      config: instance.config,
      env: pushEnv,
      logger: ctx.logger,
    });
    if (!isSetupResult(result)) throw new Error('not a SetupResult');
    expect(result.subscriptionCreated).toBe(false);
  });

  it('idempotent on ALREADY_EXISTS for topic create', async () => {
    __setTopicExists('events', false);
    const alreadyExists: Error & { code?: number } = new Error('already');
    alreadyExists.code = 6;
    __setTopicCreateError('events', alreadyExists);
    const ctx = buildContext({ setup: { createTopic: true } });
    const instance = await sourcePubSubPull(ctx);
    if (!instance.setup) throw new Error('setup not defined');
    const result = await instance.setup({
      id: 'pubsub',
      config: instance.config,
      env: pushEnv,
      logger: ctx.logger,
    });
    if (!isSetupResult(result)) throw new Error('not a SetupResult');
    expect(result.topicCreated).toBe(false);
  });

  it('emits drift warning on existing subscription with mismatched ackDeadlineSeconds', async () => {
    const alreadyExists: Error & { code?: number } = new Error('already');
    alreadyExists.code = 6;
    __setNextCreateError(alreadyExists);
    __setNextSubscriptionMetadata({ ackDeadlineSeconds: 10 });
    const logger = createMockLogger();
    const warnSpy = jest.spyOn(logger, 'warn');
    const ctx: Source.Context<Types> = {
      ...buildContext({
        setup: { ackDeadlineSeconds: 60 },
      }),
      logger,
    };
    const instance = await sourcePubSubPull(ctx);
    if (!instance.setup) throw new Error('setup not defined');
    await instance.setup({
      id: 'pubsub',
      config: instance.config,
      env: pushEnv,
      logger,
    });
    expect(warnSpy).toHaveBeenCalled();
    const warnCall = warnSpy.mock.calls.find(
      (c) => String(c[0]) === 'setup.drift',
    );
    expect(warnCall).toBeDefined();
  });
});
