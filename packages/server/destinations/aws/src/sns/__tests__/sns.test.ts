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
  __resetStsMock,
  __setStsHarness,
} from '@aws-sdk/client-sts';
import {
  createEvent,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import type { Collector } from '@walkeros/core';
import type { Config, Destination, Env } from '../types';

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

describe('SNS destination', () => {
  let destination: Destination;

  beforeEach(() => {
    __resetMock();
    __resetStsMock();
    destination = jest.requireActual('../').default;
    destination.config = {};
  });

  async function init(settings: {
    topicName: string;
    topicArn?: string;
  }): Promise<Config> {
    const config = (await destination.init({
      config: { settings },
      collector: {} as Collector.Instance,
      env,
      logger: createMockLogger(),
      id: 'sns',
    })) as Config;
    return config;
  }

  test('init validates topic via CreateTopic and captures topicArn', async () => {
    const config = await init({ topicName: 'walkeros-events' });
    expect(config.settings.topicArn).toEqual(
      expect.stringContaining('walkeros-events'),
    );
    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).toContain('CreateTopic');
  });

  test('init hard-fails with actionable message when CreateTopic errors', async () => {
    __setHarness({
      nextError: {
        name: 'AuthorizationError',
        message: 'not authorized to perform sns:CreateTopic',
      },
    });

    await expect(init({ topicName: 'walkeros-events' })).rejects.toThrow();
  });

  test('init skips CreateTopic when settings.topicArn pre-set', async () => {
    const arn = 'arn:aws:sns:eu-central-1:111111111111:walkeros-events';
    const config = await init({
      topicName: 'walkeros-events',
      topicArn: arn,
    });
    expect(config.settings.topicArn).toBe(arn);
    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).not.toContain('CreateTopic');
  });

  test('push calls Publish with TopicArn and JSON-stringified Message', async () => {
    const config = await init({ topicName: 'walkeros-events' });
    const event = createEvent();
    await destination.push(
      event,
      createMockContext({
        config,
        env,
        id: 'sns',
      }),
    );
    const publish = __getMockCalls().find((c) => c.method === 'Publish');
    expect(publish).toBeDefined();
    expect(publish?.input).toEqual(
      expect.objectContaining({
        TopicArn: config.settings.topicArn,
        Message: JSON.stringify(event),
      }),
    );
  });

  test('push resolves messageGroupId from string-path Mapping.Value', async () => {
    const config = await init({ topicName: 'walkeros-events' });
    const event = createEvent({ user: { id: 'usr-789' } });
    await destination.push(
      event,
      createMockContext({
        config,
        env,
        id: 'sns',
        rule: { settings: { messageGroupId: 'user.id' } },
      }),
    );
    const publish = __getMockCalls().find((c) => c.method === 'Publish');
    expect(publish?.input).toEqual(
      expect.objectContaining({ MessageGroupId: 'usr-789' }),
    );
  });

  test('push resolves messageGroupId from value-config form', async () => {
    const config = await init({ topicName: 'walkeros-events' });
    const event = createEvent();
    await destination.push(
      event,
      createMockContext({
        config,
        env,
        id: 'sns',
        rule: { settings: { messageGroupId: { value: 'static-group' } } },
      }),
    );
    const publish = __getMockCalls().find((c) => c.method === 'Publish');
    expect(publish?.input).toEqual(
      expect.objectContaining({ MessageGroupId: 'static-group' }),
    );
  });

  test('push resolves messageDeduplicationId from string-path', async () => {
    const config = await init({ topicName: 'walkeros-events' });
    const event = createEvent({ id: 'ev-42' });
    await destination.push(
      event,
      createMockContext({
        config,
        env,
        id: 'sns',
        rule: { settings: { messageDeduplicationId: 'id' } },
      }),
    );
    const publish = __getMockCalls().find((c) => c.method === 'Publish');
    expect(publish?.input).toEqual(
      expect.objectContaining({ MessageDeduplicationId: 'ev-42' }),
    );
  });

  test('push resolves messageAttributes (Mapping.Map) per event', async () => {
    const config = await init({ topicName: 'walkeros-events' });
    const event = createEvent({ data: { tenant_id: 'acme' } });
    await destination.push(
      event,
      createMockContext({
        config,
        env,
        id: 'sns',
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
      }),
    );
    const publish = __getMockCalls().find((c) => c.method === 'Publish');
    expect(publish?.input).toEqual(
      expect.objectContaining({
        MessageAttributes: expect.objectContaining({
          schema_version: { DataType: 'String', StringValue: 'v4' },
          tenant: { DataType: 'String', StringValue: 'acme' },
        }),
      }),
    );
  });

  test('push uses .fifo ARN when settings.topicArn is fifo', async () => {
    const fifoArn =
      'arn:aws:sns:eu-central-1:111111111111:walkeros-events.fifo';
    const config = await init({
      topicName: 'walkeros-events',
      topicArn: fifoArn,
    });
    const event = createEvent();
    await destination.push(
      event,
      createMockContext({
        config,
        env,
        id: 'sns',
      }),
    );
    const publish = __getMockCalls().find((c) => c.method === 'Publish');
    expect(publish?.input).toEqual(
      expect.objectContaining({ TopicArn: fifoArn }),
    );
  });
});
