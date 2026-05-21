jest.mock('@aws-sdk/client-sqs');
jest.mock('@aws-sdk/client-sns');

import {
  __resetMockCalls,
  __setQueueHarness,
  __setCreateQueueError,
  __getMockCalls,
} from '@aws-sdk/client-sqs';
import { __resetSnsMockCalls, __getSnsMockCalls } from '@aws-sdk/client-sns';
import { sourceSqs } from '../index';
import { setup as setupFn } from '../setup';
import { createIngest, createMockContext } from '@walkeros/core';
import type { Ingest, Source } from '@walkeros/core';
import type { Config, Setup, Types } from '../types';
import { push as pushEnv } from '../examples/env';

interface SetupResultShape {
  queueCreated: boolean;
  queueUrl: string;
  queueArn: string;
  dlqCreated?: boolean;
  dlqArn?: string;
  subscriptionArn?: string;
}

function isSetupResult(value: unknown): value is SetupResultShape {
  if (typeof value !== 'object' || value === null) return false;
  const c: {
    queueCreated?: unknown;
    queueUrl?: unknown;
    queueArn?: unknown;
  } = value;
  return (
    typeof c.queueCreated === 'boolean' &&
    typeof c.queueUrl === 'string' &&
    typeof c.queueArn === 'string'
  );
}

function buildContext(override: Partial<Config> = {}): Source.Context<Types> {
  const settings = { queueName: 'walkeros-events', region: 'eu-central-1' };
  const base = createMockContext<Types>({
    config: { settings, ...override },
    env: pushEnv,
  });
  return {
    ...base,
    id: 'sqs',
    withScope: async (_r, respond, body) =>
      body({
        ...pushEnv,
        push: pushEnv.push,
        ingest: createIngest('sqs') as Ingest,
        respond,
      } as never),
  };
}

async function runSetup(ctx: Source.Context<Types>): Promise<unknown> {
  // Pre-seed the queue so init's GetQueueUrl resolves; otherwise init throws
  // before setup ever runs.
  __setQueueHarness('walkeros-events', {});
  __setQueueHarness('walkeros-events.fifo', {});
  __setQueueHarness('orders.fifo', {});
  __setQueueHarness('walkeros-events-dlq', {});
  const instance = await sourceSqs(ctx);
  try {
    if (!instance.setup) throw new Error('setup not defined');
    return await instance.setup({
      id: ctx.id,
      config: instance.config,
      env: pushEnv,
      logger: ctx.logger,
    });
  } finally {
    if (instance.destroy) {
      // Use a small shutdownTimeoutMs to avoid hanging if anything goes wrong.
      await instance.destroy({
        id: ctx.id,
        config: instance.config,
        env: pushEnv,
        logger: ctx.logger,
      });
    }
  }
}

describe('SQS source setup', () => {
  beforeEach(() => {
    __resetMockCalls();
    __resetSnsMockCalls();
  });

  it('creates queue with declared attributes when missing', async () => {
    const ctx = buildContext({ setup: true });
    // Reset queues to start from blank, but then re-seed walkeros-events so init's GetQueueUrl works.
    // Setup will issue CreateQueueCommand against the same name; the mock merges attrs.
    __setQueueHarness('walkeros-events', {}); // ensure exists for init step
    const result = await runSetup(ctx);
    expect(isSetupResult(result)).toBe(true);
    if (!isSetupResult(result)) throw new Error('not a SetupResult');
    expect(result.queueUrl).toContain('walkeros-events');
    const createCall = __getMockCalls().find(
      (c) => c.method === 'CreateQueueCommand',
    );
    expect(createCall).toBeDefined();
    if (!createCall) return;
    const input = createCall.input;
    if (typeof input !== 'object' || input === null) {
      throw new Error('create input not object');
    }
    const obj: {
      QueueName?: unknown;
      Attributes?: Record<string, string>;
    } = input;
    expect(obj.QueueName).toBe('walkeros-events');
    expect(obj.Attributes?.VisibilityTimeout).toBe('30');
    expect(obj.Attributes?.MessageRetentionPeriod).toBe('345600');
    expect(obj.Attributes?.MaximumMessageSize).toBe('262144');
  });

  it('idempotent re-run: same name and attributes succeeds without mutation', async () => {
    const ctx = buildContext({ setup: true });
    __setQueueHarness('walkeros-events', {
      attributes: {
        VisibilityTimeout: '30',
        MessageRetentionPeriod: '345600',
        MaximumMessageSize: '262144',
      },
    });
    const result = await runSetup(ctx);
    expect(isSetupResult(result)).toBe(true);
    const calls = __getMockCalls();
    expect(calls.some((c) => c.method === 'SetQueueAttributesCommand')).toBe(
      false,
    );
    expect(calls.some((c) => c.method === 'ListQueueTagsCommand')).toBe(false);
  });

  it('hard-fails on QueueNameExists attribute conflict', async () => {
    const conflict: Error & { name: string } = new Error('queue name exists');
    conflict.name = 'QueueNameExists';
    __setCreateQueueError(conflict);
    const ctx = buildContext({ setup: true });
    await expect(runSetup(ctx)).rejects.toThrow(/[Dd]elete or rename/);
    const calls = __getMockCalls();
    expect(calls.some((c) => c.method === 'SetQueueAttributesCommand')).toBe(
      false,
    );
  });

  it('DLQ create: provisions sibling DLQ and wires RedrivePolicy', async () => {
    const setup: Setup = {
      deadLetterQueue: { create: true, maxReceiveCount: 3 },
    };
    const ctx = buildContext({ setup });
    const result = await runSetup(ctx);
    expect(isSetupResult(result)).toBe(true);
    if (!isSetupResult(result)) throw new Error('not a SetupResult');
    expect(result.dlqArn).toContain('walkeros-events-dlq');

    const creates = __getMockCalls().filter(
      (c) => c.method === 'CreateQueueCommand',
    );
    expect(creates.length).toBeGreaterThanOrEqual(2);

    // First create: DLQ with 14-day retention.
    const dlqCreate = creates.find((c) => {
      const obj = c.input as { QueueName?: unknown };
      return obj.QueueName === 'walkeros-events-dlq';
    });
    expect(dlqCreate).toBeDefined();
    if (dlqCreate) {
      const obj = dlqCreate.input as { Attributes?: Record<string, string> };
      expect(obj.Attributes?.MessageRetentionPeriod).toBe('1209600');
    }

    // Second create: main queue with RedrivePolicy referencing DLQ ARN.
    const mainCreate = creates.find((c) => {
      const obj = c.input as { QueueName?: unknown };
      return obj.QueueName === 'walkeros-events';
    });
    expect(mainCreate).toBeDefined();
    if (mainCreate) {
      const obj = mainCreate.input as { Attributes?: Record<string, string> };
      const redrive = obj.Attributes?.RedrivePolicy;
      expect(redrive).toBeDefined();
      if (redrive) {
        const parsed: {
          deadLetterTargetArn?: string;
          maxReceiveCount?: number;
        } = JSON.parse(redrive);
        expect(parsed.maxReceiveCount).toBe(3);
        expect(parsed.deadLetterTargetArn).toContain('walkeros-events-dlq');
      }
    }
  });

  it('DLQ ARN: uses provided ARN without creating a new DLQ', async () => {
    const dlqArn = 'arn:aws:sqs:eu-central-1:000000000000:existing-dlq';
    const setup: Setup = { deadLetterQueue: { arn: dlqArn } };
    const ctx = buildContext({ setup });
    const result = await runSetup(ctx);
    expect(isSetupResult(result)).toBe(true);

    const creates = __getMockCalls().filter(
      (c) => c.method === 'CreateQueueCommand',
    );
    expect(creates.length).toBe(1);

    const main = creates[0];
    const obj = main.input as { Attributes?: Record<string, string> };
    const redrive = obj.Attributes?.RedrivePolicy;
    expect(redrive).toBeDefined();
    if (redrive) {
      const parsed: { deadLetterTargetArn?: string } = JSON.parse(redrive);
      expect(parsed.deadLetterTargetArn).toBe(dlqArn);
    }
  });

  it('SNS subscribe: creates subscription and adds queue policy', async () => {
    const topicArn = 'arn:aws:sns:eu-central-1:000000000000:events-topic';
    const setup: Setup = {
      subscribeToSnsTopic: { topicArn, rawMessageDelivery: true },
    };
    const ctx = buildContext({ setup });
    const result = await runSetup(ctx);
    expect(isSetupResult(result)).toBe(true);
    if (!isSetupResult(result)) throw new Error('not a SetupResult');
    expect(result.subscriptionArn).toBeDefined();

    const snsCalls = __getSnsMockCalls();
    const subscribe = snsCalls.find((c) => c.method === 'SubscribeCommand');
    expect(subscribe).toBeDefined();
    if (subscribe) {
      const subInput = subscribe.input as {
        Protocol?: unknown;
        Endpoint?: unknown;
        Attributes?: { RawMessageDelivery?: unknown };
      };
      expect(subInput.Protocol).toBe('sqs');
      expect(typeof subInput.Endpoint).toBe('string');
      expect(subInput.Attributes?.RawMessageDelivery).toBe('true');
    }

    const create = __getMockCalls().find((c) => {
      const obj = c.input as { QueueName?: unknown };
      return (
        c.method === 'CreateQueueCommand' && obj.QueueName === 'walkeros-events'
      );
    });
    expect(create).toBeDefined();
    if (create) {
      const obj = create.input as { Attributes?: Record<string, string> };
      const policy = obj.Attributes?.Policy;
      expect(policy).toBeDefined();
      if (policy) {
        interface PolicyDoc {
          Statement: Array<{
            Sid?: string;
            Action?: string;
            Condition?: { ArnEquals?: Record<string, string> };
          }>;
        }
        const parsed: PolicyDoc = JSON.parse(policy);
        const stmt = parsed.Statement[0];
        expect(stmt.Action).toBe('SQS:SendMessage');
        expect(stmt.Sid).toBe('walkerOSAllowSNSPublish-sqs');
        expect(stmt.Condition?.ArnEquals?.['aws:SourceArn']).toBe(topicArn);
      }
    }
  });

  it('throws when settings.queueName is missing', async () => {
    const base = createMockContext<Types>({
      config: { settings: { region: 'eu-central-1' }, setup: true },
      env: pushEnv,
    });
    const ctx: Source.Context<Types> = {
      ...base,
      id: 'sqs',
      withScope: async (_r, respond, body) =>
        body({
          ...pushEnv,
          push: pushEnv.push,
          ingest: createIngest('sqs') as Ingest,
          respond,
        } as never),
    };
    // Init itself throws because queueName is required.
    await expect(sourceSqs(ctx)).rejects.toThrow(/queueName/);
  });

  it('skips when config.setup is false', async () => {
    const ctx = buildContext({ setup: false });
    const result = await runSetup(ctx);
    expect(result).toBeUndefined();
    const calls = __getMockCalls().filter(
      (c) =>
        c.method === 'CreateQueueCommand' ||
        c.method === 'SetQueueAttributesCommand',
    );
    expect(calls).toEqual([]);
  });

  it('FIFO queue: appends .fifo suffix and enables ContentBasedDeduplication', async () => {
    const settings = { queueName: 'orders', region: 'eu-central-1' };
    const setup: Setup = { fifoQueue: true };
    __setQueueHarness('orders.fifo', {});
    __setQueueHarness('orders', {});
    const base = createMockContext<Types>({
      config: { settings, setup },
      env: pushEnv,
    });
    const ctx: Source.Context<Types> = {
      ...base,
      id: 'sqs',
      withScope: async (_r, respond, body) =>
        body({
          ...pushEnv,
          push: pushEnv.push,
          ingest: createIngest('sqs') as Ingest,
          respond,
        } as never),
    };
    const instance = await sourceSqs(ctx);
    if (!instance.setup) throw new Error('setup not defined');
    const result = await instance.setup({
      id: 'sqs',
      config: instance.config,
      env: pushEnv,
      logger: ctx.logger,
    });
    if (instance.destroy) {
      await instance.destroy({
        id: 'sqs',
        config: instance.config,
        env: pushEnv,
        logger: ctx.logger,
      });
    }
    expect(isSetupResult(result)).toBe(true);

    const create = __getMockCalls().find((c) => {
      const obj = c.input as { QueueName?: unknown };
      return (
        c.method === 'CreateQueueCommand' && obj.QueueName === 'orders.fifo'
      );
    });
    expect(create).toBeDefined();
    if (create) {
      const obj = create.input as { Attributes?: Record<string, string> };
      expect(obj.Attributes?.FifoQueue).toBe('true');
      expect(obj.Attributes?.ContentBasedDeduplication).toBe('true');
    }
  });

  it('non-declared tag is left untouched (no ListQueueTags)', async () => {
    __setQueueHarness('walkeros-events', { tags: { extra: 'op-managed' } });
    const setup: Setup = { tags: { env: 'prod', team: 'data' } };
    const ctx = buildContext({ setup });
    await runSetup(ctx);
    const calls = __getMockCalls();
    expect(calls.some((c) => c.method === 'ListQueueTagsCommand')).toBe(false);

    const create = calls.find((c) => c.method === 'CreateQueueCommand');
    expect(create).toBeDefined();
    if (create) {
      const obj = create.input as { tags?: Record<string, string> };
      expect(obj.tags).toEqual({ env: 'prod', team: 'data' });
    }
  });

  it('returns structured result with queueCreated/queueUrl/queueArn', async () => {
    const ctx = buildContext({ setup: true });
    const result = await runSetup(ctx);
    expect(isSetupResult(result)).toBe(true);
    if (!isSetupResult(result)) throw new Error('not a SetupResult');
    expect(result.queueUrl).toMatch(/walkeros-events/);
    expect(result.queueArn).toMatch(/walkeros-events/);
    expect(typeof result.queueCreated).toBe('boolean');
  });
});

// Direct setup invocation (without booting init) for callable-from-CLI proof.
describe('SQS setup direct invocation', () => {
  beforeEach(() => {
    __resetMockCalls();
    __resetSnsMockCalls();
  });

  it('setup function is callable directly with a LifecycleContext', async () => {
    const settings = { queueName: 'walkeros-events', region: 'eu-central-1' };
    const config: Config = { settings, setup: true };
    const base = createMockContext<Types>({ config, env: pushEnv });
    const result = await setupFn({
      id: 'sqs',
      config,
      env: pushEnv,
      logger: base.logger,
    });
    expect(result).toBeDefined();
  });
});
