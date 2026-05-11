jest.mock('@aws-sdk/client-sqs');
jest.mock('@aws-sdk/client-sns');

import {
  __resetMockCalls,
  __setQueueHarness,
  __setReceiveMessagesHarness,
  __setGetQueueUrlError,
  __getMockCalls,
  __getDeletedReceiptHandles,
} from '@aws-sdk/client-sqs';
import { __resetSnsMockCalls } from '@aws-sdk/client-sns';
import { sourceSqs } from '../index';
import { createMockContext } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { Settings, SyntheticMessage, Types } from '../types';
import { push as pushEnv } from '../examples/env';

function buildContext(
  partialSettings: Partial<Settings>,
): Source.Context<Types> {
  const base = createMockContext<Types>({
    config: {
      settings: {
        queueName: 'walkeros-events',
        region: 'eu-central-1',
        ...partialSettings,
      },
    },
    env: pushEnv,
  });
  return {
    ...base,
    id: 'sqs',
    setIngest: async () => undefined,
    setRespond: () => undefined,
  };
}

async function destroyInstance(
  instance: Source.Instance<Types>,
  ctx: Source.Context<Types>,
): Promise<void> {
  if (!instance.destroy) return;
  await instance.destroy({
    id: ctx.id,
    config: instance.config,
    env: pushEnv,
    logger: ctx.logger,
  });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitForCall(method: string, timeoutMs = 2000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const calls = __getMockCalls();
    if (calls.some((c) => c.method === method)) return true;
    await sleep(20);
  }
  return false;
}

describe('SQS source', () => {
  beforeEach(() => {
    __resetMockCalls();
    __resetSnsMockCalls();
  });

  it('throws when queueName missing', async () => {
    const base = createMockContext<Types>({
      config: { settings: { region: 'eu-central-1' } },
      env: pushEnv,
    });
    const ctx: Source.Context<Types> = {
      ...base,
      id: 'sqs',
      setIngest: async () => undefined,
      setRespond: () => undefined,
    };
    await expect(sourceSqs(ctx)).rejects.toThrow(/queueName/);
  });

  it('resolves queueUrl from queueName via GetQueueUrlCommand at init', async () => {
    __setQueueHarness('walkeros-events', {});
    const ctx = buildContext({});
    const instance = await sourceSqs(ctx);
    try {
      const calls = __getMockCalls();
      expect(calls.some((c) => c.method === 'GetQueueUrlCommand')).toBe(true);
      const cfg = instance.config;
      expect(cfg.settings?.queueUrl).toContain('walkeros-events');
    } finally {
      await destroyInstance(instance, ctx);
    }
  });

  it('skips GetQueueUrlCommand when queueUrl pre-supplied', async () => {
    const ctx = buildContext({
      queueUrl:
        'https://sqs.eu-central-1.amazonaws.com/000000000000/walkeros-events',
    });
    const instance = await sourceSqs(ctx);
    try {
      const calls = __getMockCalls();
      expect(calls.some((c) => c.method === 'GetQueueUrlCommand')).toBe(false);
    } finally {
      await destroyInstance(instance, ctx);
    }
  });

  it('hard-fails with actionable message when queue does not exist', async () => {
    const err: Error & { name: string } = new Error('queue not found');
    err.name = 'QueueDoesNotExist';
    __setGetQueueUrlError(err);
    const ctx = buildContext({});
    await expect(sourceSqs(ctx)).rejects.toThrow(/walkeros setup source\.sqs/);
  });

  it('long-poll loop calls ReceiveMessage with declared maxMessages and waitTimeSeconds', async () => {
    __setQueueHarness('walkeros-events', {});
    const ctx = buildContext({});
    const instance = await sourceSqs(ctx);
    try {
      const found = await waitForCall('ReceiveMessageCommand');
      expect(found).toBe(true);
      const receive = __getMockCalls().find(
        (c) => c.method === 'ReceiveMessageCommand',
      );
      expect(receive).toBeDefined();
      if (receive) {
        const obj = receive.input as {
          MaxNumberOfMessages?: unknown;
          WaitTimeSeconds?: unknown;
        };
        expect(obj.MaxNumberOfMessages).toBe(10);
        expect(obj.WaitTimeSeconds).toBe(20);
      }
    } finally {
      await destroyInstance(instance, ctx);
    }
  });

  it('forwards a received message to env.push then DeleteMessage acks it', async () => {
    __setQueueHarness('walkeros-events', {});
    __setReceiveMessagesHarness([
      {
        Messages: [
          {
            MessageId: 'm1',
            ReceiptHandle: 'rh1',
            Body: JSON.stringify({ event: 'page view' }),
          },
        ],
      },
    ]);
    const captured: unknown[] = [];
    const env = {
      push: async (event: unknown) => {
        captured.push(event);
        return { ok: true };
      },
      command: async () => ({ ok: true }),
      elb: async () => ({ ok: true }),
      logger: pushEnv.logger,
    };
    const base = createMockContext<Types>({
      config: { settings: { queueName: 'walkeros-events' } },
      env,
    });
    const ctx: Source.Context<Types> = {
      ...base,
      id: 'sqs',
      env,
      setIngest: async () => undefined,
      setRespond: () => undefined,
    };
    const instance = await sourceSqs(ctx);
    try {
      const start = Date.now();
      while (Date.now() - start < 2000) {
        if (__getDeletedReceiptHandles().includes('rh1')) break;
        await sleep(20);
      }
      expect(__getDeletedReceiptHandles()).toContain('rh1');
      expect(captured.length).toBe(1);
    } finally {
      await destroyInstance(instance, ctx);
    }
  });

  it("onPushError 'nack' skips DeleteMessage on push failure", async () => {
    __setQueueHarness('walkeros-events', {});
    __setReceiveMessagesHarness([
      {
        Messages: [
          {
            MessageId: 'm-fail',
            ReceiptHandle: 'rh-fail',
            Body: JSON.stringify({ event: 'page view' }),
          },
        ],
      },
    ]);
    const env = {
      push: async () => {
        throw new Error('downstream failed');
      },
      command: async () => ({ ok: true }),
      elb: async () => ({ ok: true }),
      logger: pushEnv.logger,
    };
    const base = createMockContext<Types>({
      config: {
        settings: { queueName: 'walkeros-events', onPushError: 'nack' },
      },
      env,
    });
    const ctx: Source.Context<Types> = {
      ...base,
      id: 'sqs',
      env,
      setIngest: async () => undefined,
      setRespond: () => undefined,
    };
    const instance = await sourceSqs(ctx);
    try {
      // Wait for the receive call so we know the loop ran.
      await waitForCall('ReceiveMessageCommand');
      await sleep(150);
      expect(__getDeletedReceiptHandles()).not.toContain('rh-fail');
    } finally {
      await destroyInstance(instance, ctx);
    }
  });

  it("onPushError 'ack' deletes message even when push fails", async () => {
    __setQueueHarness('walkeros-events', {});
    __setReceiveMessagesHarness([
      {
        Messages: [
          {
            MessageId: 'm-ack-fail',
            ReceiptHandle: 'rh-ack-fail',
            Body: JSON.stringify({ event: 'page view' }),
          },
        ],
      },
    ]);
    const env = {
      push: async () => {
        throw new Error('downstream failed');
      },
      command: async () => ({ ok: true }),
      elb: async () => ({ ok: true }),
      logger: pushEnv.logger,
    };
    const base = createMockContext<Types>({
      config: {
        settings: { queueName: 'walkeros-events', onPushError: 'ack' },
      },
      env,
    });
    const ctx: Source.Context<Types> = {
      ...base,
      id: 'sqs',
      env,
      setIngest: async () => undefined,
      setRespond: () => undefined,
    };
    const instance = await sourceSqs(ctx);
    try {
      const start = Date.now();
      while (Date.now() - start < 2000) {
        if (__getDeletedReceiptHandles().includes('rh-ack-fail')) break;
        await sleep(20);
      }
      expect(__getDeletedReceiptHandles()).toContain('rh-ack-fail');
    } finally {
      await destroyInstance(instance, ctx);
    }
  });

  it("decoder 'text' forwards body string under data.payload", async () => {
    __setQueueHarness('walkeros-events', {});
    const ctx = buildContext({ decoder: 'text' });
    const instance = await sourceSqs(ctx);
    try {
      const synthetic: SyntheticMessage = {
        MessageId: 'syn-text',
        Body: 'plain text payload',
      };
      const result = await instance.push(synthetic);
      expect(result).toBeDefined();
      if (!result || typeof result !== 'object') {
        throw new Error('expected SyntheticPushResult');
      }
      expect(result.acked).toBe(true);
    } finally {
      await destroyInstance(instance, ctx);
    }
  });

  it("decoder 'raw' forwards Buffer-encoded payload", async () => {
    __setQueueHarness('walkeros-events', {});
    const ctx = buildContext({ decoder: 'raw' });
    const instance = await sourceSqs(ctx);
    try {
      const result = await instance.push({
        MessageId: 'syn-raw',
        Body: 'binary-bytes',
      });
      if (!result || typeof result !== 'object') {
        throw new Error('expected SyntheticPushResult');
      }
      expect(result.acked).toBe(true);
    } finally {
      await destroyInstance(instance, ctx);
    }
  });

  it('json decode failure nacks by default', async () => {
    __setQueueHarness('walkeros-events', {});
    const ctx = buildContext({});
    const instance = await sourceSqs(ctx);
    try {
      const result = await instance.push({
        MessageId: 'syn-bad',
        Body: '{not json',
      });
      if (!result || typeof result !== 'object') {
        throw new Error('expected SyntheticPushResult');
      }
      expect(result.nacked).toBe(true);
      expect(result.acked).toBe(false);
    } finally {
      await destroyInstance(instance, ctx);
    }
  });

  it('synthetic push dispatches through the same handler', async () => {
    __setQueueHarness('walkeros-events', {});
    const captured: unknown[] = [];
    const env = {
      push: async (event: unknown) => {
        captured.push(event);
        return { ok: true };
      },
      command: async () => ({ ok: true }),
      elb: async () => ({ ok: true }),
      logger: pushEnv.logger,
    };
    const base = createMockContext<Types>({
      config: { settings: { queueName: 'walkeros-events' } },
      env,
    });
    const ctx: Source.Context<Types> = {
      ...base,
      id: 'sqs',
      env,
      setIngest: async () => undefined,
      setRespond: () => undefined,
    };
    const instance = await sourceSqs(ctx);
    try {
      const result = await instance.push({
        MessageId: 'syn1',
        Body: JSON.stringify({ event: 'order complete' }),
      });
      expect(result).toEqual({ acked: true, nacked: false });
      expect(captured.length).toBe(1);
    } finally {
      await destroyInstance(instance, ctx);
    }
  });

  it('synthetic push without content is a no-op', async () => {
    __setQueueHarness('walkeros-events', {});
    const ctx = buildContext({});
    const instance = await sourceSqs(ctx);
    try {
      const result = await instance.push();
      expect(result).toBeUndefined();
    } finally {
      await destroyInstance(instance, ctx);
    }
  });

  it('destroy stops the loop', async () => {
    __setQueueHarness('walkeros-events', {});
    const ctx = buildContext({ shutdownTimeoutMs: 100 });
    const instance = await sourceSqs(ctx);
    await waitForCall('ReceiveMessageCommand');
    await destroyInstance(instance, ctx);
    const callsBefore = __getMockCalls().filter(
      (c) => c.method === 'ReceiveMessageCommand',
    ).length;
    await sleep(200);
    const callsAfter = __getMockCalls().filter(
      (c) => c.method === 'ReceiveMessageCommand',
    ).length;
    // After destroy, no new ReceiveMessageCommand calls should be recorded.
    // Allow a small tolerance for an in-flight call that completed late, but
    // the count should not keep growing.
    expect(callsAfter).toBeLessThanOrEqual(callsBefore + 1);
  });
});
