jest.mock('@aws-sdk/client-sns');
jest.mock('@aws-sdk/client-sts');

import {
  CreateTopicCommand,
  GetTopicAttributesCommand,
  PublishCommand,
  SNSClient,
  SubscribeCommand,
  __getMockCalls,
  __resetMock,
  __setHarness,
} from '@aws-sdk/client-sns';
import {
  GetCallerIdentityCommand,
  STSClient,
  __getStsMockCalls,
  __resetStsMock,
  __setStsHarness,
} from '@aws-sdk/client-sts';
import {
  createEvent,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import type { MockLogger } from '@walkeros/core';
import type { Config, Env, PartialConfig, SendClient } from '../types';
import { expectSimulationResolves } from '@walkeros/core/dev';
import { AwsDeliveryError } from '../../lib/errors';
import destination from '../';
import * as snsExamples from '../examples';

const env: Env = {
  AWS: {
    SNSClient,
    STSClient,
    CreateTopicCommand,
    PublishCommand,
    GetTopicAttributesCommand,
    SubscribeCommand,
    GetCallerIdentityCommand,
  },
};

const ARN = 'arn:aws:sns:eu-west-1:111111111111:walkeros-events';
const FIFO_ARN = 'arn:aws:sns:eu-west-1:111111111111:orders.fifo';
const savedEnv = { ...process.env };

beforeEach(() => {
  __resetMock();
  __resetStsMock();
  delete process.env.AWS_REGION;
  delete process.env.AWS_PROFILE;
  process.env.AWS_CONFIG_FILE = '/nonexistent/aws-config';
});

afterAll(() => {
  process.env = savedEnv;
});

async function init(
  config: PartialConfig,
  options: { env?: Env; logger?: MockLogger } = { env },
): Promise<Config> {
  const resolved = await destination.init(
    createMockContext({
      config,
      env: options.env,
      id: 'sns',
      logger: options.logger ?? createMockLogger(),
    }),
  );
  if (!resolved || !resolved.settings) throw new Error('init returned nothing');
  return { ...resolved, settings: resolved.settings };
}

function sentMethods(): string[] {
  return __getMockCalls()
    .map((c) => c.method)
    .filter((m) => !m.endsWith('.ctor'));
}

function publishInput(): unknown {
  return __getMockCalls().find((c) => c.method === 'Publish')?.input;
}

async function publish(
  config: Config,
  event = createEvent(),
  extra: { rule?: unknown; data?: unknown; logger?: MockLogger } = {},
) {
  await destination.push(
    event,
    createMockContext({ config, env, id: 'sns', ...extra }),
  );
  return event;
}

describe('SNS init', () => {
  test('without env builds the SDK SNSClient and makes no call', async () => {
    const config = await init(
      { settings: { topicArn: ARN } },
      { env: undefined },
    );

    expect(config.settings.client).toBeInstanceOf(SNSClient);
    expect(sentMethods()).toEqual([]);
    expect(__getStsMockCalls()).toEqual([]);
  });

  test('topicArn alone resolves region and name', async () => {
    const config = await init({ settings: { topicArn: ARN } });
    expect(config.settings).toMatchObject({
      topicArn: ARN,
      topicName: 'walkeros-events',
      region: 'eu-west-1',
    });
    const ctor = __getMockCalls().find((c) => c.method === 'SNSClient.ctor');
    expect(ctor?.input).toMatchObject({
      region: 'eu-west-1',
      requestHandler: { requestTimeout: 2500, throwOnRequestTimeout: true },
    });
  });

  test('a topicName equal to the ARN name is accepted', async () => {
    const config = await init({
      settings: { topicArn: ARN, topicName: 'walkeros-events' },
    });
    expect(config.settings.topicName).toBe('walkeros-events');
  });

  test('topicName alone passes init, region from AWS_REGION', async () => {
    process.env.AWS_REGION = 'ap-south-1';
    const config = await init({ settings: { topicName: 'walkeros-events' } });
    expect(config.settings.region).toBe('ap-south-1');
    expect(config.settings.topicArn).toBeUndefined();
  });

  test.each([
    [
      'a region against the ARN region',
      { topicArn: ARN, region: 'us-east-1' },
      'settings.region',
    ],
    [
      'a name against the ARN name',
      { topicArn: ARN, topicName: 'other-topic' },
      'settings.topicName',
    ],
    [
      'an invalid ARN',
      { topicArn: 'arn:aws:sqs:eu-west-1:1:q' },
      'settings.topicArn',
    ],
    ['neither ARN nor name', {}, 'settings.topicArn'],
  ])('%s throws', async (_case, settings, fragment) => {
    const error = await init({ settings }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AwsDeliveryError);
    expect(error).toMatchObject({ code: 'InvalidConfig' });
    expect(String(error)).toContain(fragment);
  });

  test('never sends CreateTopic', async () => {
    await init({ settings: { topicName: 'walkeros-events' } });
    expect(sentMethods()).toEqual([]);
  });

  test('config.batch gives exactly one warn', async () => {
    const logger = createMockLogger();
    await init(
      { settings: { topicArn: ARN }, batch: { size: 10 } },
      { env, logger },
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain('config.batch');
  });

  test('config.credentials reach the client', async () => {
    const keys = { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'SECRET' };
    await init({ settings: { topicArn: ARN }, credentials: keys });
    const ctor = __getMockCalls().find((c) => c.method === 'SNSClient.ctor');
    expect(ctor?.input).toMatchObject({ credentials: keys });
  });
});

describe('SNS push', () => {
  test('publishes the event as the Message', async () => {
    const config = await init({ settings: { topicArn: ARN } });
    const event = await publish(config);
    expect(publishInput()).toEqual({
      TopicArn: ARN,
      Message: JSON.stringify(event),
    });
  });

  test('publishes mapped data instead of the event', async () => {
    const config = await init({ settings: { topicArn: ARN } });
    await publish(config, createEvent(), { data: { id: 'mapped' } });
    expect(publishInput()).toMatchObject({ Message: '{"id":"mapped"}' });
  });

  test('a FIFO topic defaults MessageDeduplicationId to the event id', async () => {
    const config = await init({ settings: { topicArn: FIFO_ARN } });
    await publish(config, createEvent({ id: 'ev-1' }));
    expect(publishInput()).toMatchObject({ MessageDeduplicationId: 'ev-1' });
  });

  test('a mapped MessageDeduplicationId wins', async () => {
    const config = await init({ settings: { topicArn: FIFO_ARN } });
    await publish(config, createEvent({ id: 'ev-1', user: { id: 'u-1' } }), {
      rule: { settings: { messageDeduplicationId: 'user.id' } },
    });
    expect(publishInput()).toMatchObject({ MessageDeduplicationId: 'u-1' });
  });

  test('a standard topic gets no deduplication id', async () => {
    const config = await init({ settings: { topicArn: ARN } });
    await publish(config);
    expect(publishInput()).not.toHaveProperty('MessageDeduplicationId');
  });

  test('resolves messageGroupId from a string path and a value config', async () => {
    const config = await init({ settings: { topicArn: FIFO_ARN } });
    await publish(config, createEvent({ user: { id: 'usr-789' } }), {
      rule: { settings: { messageGroupId: 'user.id' } },
    });
    expect(publishInput()).toMatchObject({ MessageGroupId: 'usr-789' });

    __resetMock();
    await publish(config, createEvent(), {
      rule: { settings: { messageGroupId: { value: 'static-group' } } },
    });
    expect(publishInput()).toMatchObject({ MessageGroupId: 'static-group' });
  });

  test('resolves messageAttributes per event', async () => {
    const config = await init({ settings: { topicArn: ARN } });
    await publish(config, createEvent({ data: { tenant_id: 'acme' } }), {
      rule: {
        settings: {
          messageAttributes: {
            schema_version: {
              value: { DataType: 'String', StringValue: 'v4' },
            },
            tenant: 'data.tenant_id',
          },
        },
      },
    });
    expect(publishInput()).toMatchObject({
      MessageAttributes: {
        schema_version: { DataType: 'String', StringValue: 'v4' },
        tenant: { DataType: 'String', StringValue: 'acme' },
      },
    });
  });

  test('a topicName-only config looks up the account once, at the first publish', async () => {
    __setStsHarness({ accountId: '222222222222' });
    const config = await init({
      settings: { topicName: 'walkeros-events', region: 'eu-west-1' },
    });
    expect(__getStsMockCalls()).toEqual([]);

    await publish(config);
    await publish(config);

    const lookups = __getStsMockCalls().filter(
      (c) => c.method === 'GetCallerIdentityCommand',
    );
    expect(lookups).toHaveLength(1);
    expect(publishInput()).toMatchObject({
      TopicArn: 'arn:aws:sns:eu-west-1:222222222222:walkeros-events',
    });
  });

  test('the lookup client makes one attempt and never takes a user handler instance', async () => {
    const handler = { handle: jest.fn(), destroy: jest.fn() };
    const config = await init({
      settings: {
        topicName: 'walkeros-events',
        config: { requestHandler: handler },
      },
    });
    await publish(config);

    const ctor = __getStsMockCalls().find((c) => c.method === 'STSClient.ctor');
    expect(ctor?.input).toMatchObject({
      maxAttempts: 1,
      requestHandler: { requestTimeout: 2500, throwOnRequestTimeout: true },
    });
  });

  test('a failed account lookup is retried at the next publish', async () => {
    __setStsHarness({ error: new Error('network down') });
    const config = await init({ settings: { topicName: 'walkeros-events' } });

    await expect(publish(config)).rejects.toBeInstanceOf(AwsDeliveryError);
    await publish(config);
    expect(publishInput()).toMatchObject({
      TopicArn: 'arn:aws:sns:eu-central-1:000000000000:walkeros-events',
    });
  });

  test('a publish failure throws an AwsDeliveryError and logs no error', async () => {
    const logger = createMockLogger();
    const config = await init({ settings: { topicArn: ARN } });
    __setHarness({
      nextError: {
        name: 'NotFoundException',
        message: 'Topic does not exist',
        $metadata: { httpStatusCode: 404 },
      },
    });

    const error = await publish(config, createEvent(), { logger }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(AwsDeliveryError);
    expect(error).toMatchObject({
      code: 'NotFoundException',
      status: 404,
      retryable: false,
    });
    expect(String(error)).toContain(ARN);
    expect(String(error)).toContain('eu-west-1');
    expect(String(error)).toContain('walkeros setup destination.sns');
    expect(error instanceof Error && error.cause).toBeInstanceOf(Error);
    expect(logger.error).not.toHaveBeenCalled();
  });
});

describe('SNS destroy', () => {
  test('closes an owned client', async () => {
    const config = await init({ settings: { topicArn: ARN } });
    const client = config.settings.client;
    const destroy = jest.fn();
    if (client) client.destroy = destroy;

    await destination.destroy?.({
      id: 'sns',
      config,
      env,
      logger: createMockLogger(),
    });
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  test('never closes a client built on a user request handler instance', async () => {
    const handler = { handle: jest.fn(), destroy: jest.fn() };
    const config = await init({
      settings: { topicArn: ARN, config: { requestHandler: handler } },
    });
    const client = config.settings.client;
    const destroy = jest.fn();
    if (client) client.destroy = destroy;

    await destination.destroy?.({
      id: 'sns',
      config,
      env,
      logger: createMockLogger(),
    });
    expect(destroy).not.toHaveBeenCalled();
  });

  test('waits for a pending account lookup before closing', async () => {
    const order: string[] = [];
    class SlowSTSClient implements SendClient {
      async send(): Promise<unknown> {
        await new Promise((resolve) => setTimeout(resolve, 20));
        order.push('lookup');
        return { Account: '333333333333' };
      }
    }
    const slowEnv: Env = { AWS: { ...env.AWS, STSClient: SlowSTSClient } };
    const config = await init(
      { settings: { topicName: 'walkeros-events' } },
      { env: slowEnv },
    );
    const client = config.settings.client;
    if (client) client.destroy = () => order.push('closed');

    const pushing = destination.push(
      createEvent(),
      createMockContext({ config, env: slowEnv, id: 'sns' }),
    );
    await Promise.resolve();
    await destination.destroy?.({
      id: 'sns',
      config,
      env: slowEnv,
      logger: createMockLogger(),
    });
    await pushing;

    expect(order).toEqual(['lookup', 'closed']);
  });

  test('never closes a user client', async () => {
    const destroy = jest.fn();
    const client: SendClient = { send: jest.fn(), destroy };
    const config = await init({ settings: { topicArn: ARN, client } });

    await destination.destroy?.({
      id: 'sns',
      config,
      env,
      logger: createMockLogger(),
    });
    expect(config.settings.client).toBe(client);
    expect(destroy).not.toHaveBeenCalled();
  });
});

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(snsExamples.env));
