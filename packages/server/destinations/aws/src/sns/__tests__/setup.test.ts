jest.mock('@aws-sdk/client-sns');
jest.mock('@aws-sdk/client-sts');

import {
  SNSClient,
  __getMockCalls,
  __resetMock,
  __setHarness,
} from '@aws-sdk/client-sns';
import {
  STSClient,
  __resetStsMock,
  __setStsHarness,
  __getStsMockCalls,
} from '@aws-sdk/client-sts';
import { createMockLogger } from '@walkeros/core';
import { setup, __resetAccountIdCache } from '../setup';
import {
  CreateTopicCommand,
  PublishCommand,
  GetTopicAttributesCommand,
  SubscribeCommand,
} from '@aws-sdk/client-sns';
import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';

const env = {
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

describe('SNS setup', () => {
  beforeEach(() => {
    __resetMock();
    __resetStsMock();
    __resetAccountIdCache();
  });

  test('creates topic when GetTopicAttributes returns 404', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const logger = createMockLogger();
    const result = await setup({
      id: 'sns',
      config: {
        settings: { topicName: 'walkeros-events' },
        setup: true,
      },
      env,
      logger,
    });

    expect(result).toEqual({
      topicArn: expect.stringContaining('walkeros-events'),
      topicCreated: true,
      tagsApplied: 0,
      subscriptionsCreated: 0,
    });

    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).toContain('GetTopicAttributes');
    expect(methods).toContain('CreateTopic');
    const stsMethods = __getStsMockCalls().map((c) => c.method);
    expect(stsMethods).toContain('GetCallerIdentityCommand');
  });

  test('idempotent: GetTopicAttributes 200 yields topicCreated false, CreateTopic still runs', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const arn = 'arn:aws:sns:eu-central-1:111111111111:walkeros-events';
    __setHarness({
      topics: {
        [arn]: { topicArn: arn, attributes: {}, tags: {} },
      },
    });

    const logger = createMockLogger();
    const result = await setup({
      id: 'sns',
      config: {
        settings: { topicName: 'walkeros-events' },
        setup: true,
      },
      env,
      logger,
    });

    expect(result).toEqual({
      topicArn: arn,
      topicCreated: false,
      tagsApplied: 0,
      subscriptionsCreated: 0,
    });

    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).toContain('GetTopicAttributes');
    expect(methods).toContain('CreateTopic');
  });

  test('applies displayName as a CreateTopic attribute', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const logger = createMockLogger();
    await setup({
      id: 'sns',
      config: {
        settings: { topicName: 'walkeros-events' },
        setup: { displayName: 'My Events' },
      },
      env,
      logger,
    });

    const create = __getMockCalls().find((c) => c.method === 'CreateTopic');
    expect(create).toBeDefined();
    expect(create?.input).toEqual(
      expect.objectContaining({
        Name: 'walkeros-events',
        Attributes: expect.objectContaining({ DisplayName: 'My Events' }),
      }),
    );
  });

  test('applies kmsMasterKeyId as a CreateTopic attribute', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const logger = createMockLogger();
    await setup({
      id: 'sns',
      config: {
        settings: { topicName: 'walkeros-events' },
        setup: { kmsMasterKeyId: 'alias/aws/sns' },
      },
      env,
      logger,
    });

    const create = __getMockCalls().find((c) => c.method === 'CreateTopic');
    expect(create?.input).toEqual(
      expect.objectContaining({
        Attributes: expect.objectContaining({
          KmsMasterKeyId: 'alias/aws/sns',
        }),
      }),
    );
  });

  test('applies tags via CreateTopic Tags parameter', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const logger = createMockLogger();
    const result = await setup({
      id: 'sns',
      config: {
        settings: { topicName: 'walkeros-events' },
        setup: { tags: { env: 'prod', team: 'data' } },
      },
      env,
      logger,
    });

    const create = __getMockCalls().find((c) => c.method === 'CreateTopic');
    expect(create?.input).toEqual(
      expect.objectContaining({
        Tags: expect.arrayContaining([
          { Key: 'env', Value: 'prod' },
          { Key: 'team', Value: 'data' },
        ]),
      }),
    );
    expect(result?.tagsApplied).toBe(2);
  });

  test('FIFO topic auto-suffixes name and applies FifoTopic attributes', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const logger = createMockLogger();
    await setup({
      id: 'sns',
      config: {
        settings: { topicName: 'orders' },
        setup: { fifoTopic: true },
      },
      env,
      logger,
    });

    const create = __getMockCalls().find((c) => c.method === 'CreateTopic');
    expect(create?.input).toEqual(
      expect.objectContaining({
        Name: 'orders.fifo',
        Attributes: expect.objectContaining({
          FifoTopic: 'true',
          ContentBasedDeduplication: 'true',
        }),
      }),
    );
    const infoCalls = (logger.info as jest.Mock).mock.calls.flat();
    expect(
      infoCalls.some((m) => typeof m === 'string' && /fifo/i.test(m)),
    ).toBe(true);
  });

  test('FIFO mismatch errors clearly', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const logger = createMockLogger();
    await expect(
      setup({
        id: 'sns',
        config: {
          settings: { topicName: 'foo.fifo' },
          setup: { fifoTopic: false },
        },
        env,
        logger,
      }),
    ).rejects.toThrow(/FIFO suffix/i);
  });

  test('creates declared subscriptions', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const logger = createMockLogger();
    const result = await setup({
      id: 'sns',
      config: {
        settings: { topicName: 'walkeros-events' },
        setup: {
          subscriptions: [
            {
              protocol: 'sqs',
              endpoint:
                'arn:aws:sqs:eu-central-1:111111111111:walkeros-events-q',
            },
          ],
        },
      },
      env,
      logger,
    });

    expect(result?.subscriptionsCreated).toBe(1);
    const sub = __getMockCalls().find((c) => c.method === 'Subscribe');
    expect(sub?.input).toEqual(
      expect.objectContaining({
        Protocol: 'sqs',
        Endpoint: 'arn:aws:sqs:eu-central-1:111111111111:walkeros-events-q',
        TopicArn: expect.stringContaining('walkeros-events'),
      }),
    );
  });

  test('Subscribe is idempotent on re-run', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const logger = createMockLogger();
    const settingsConfig = {
      settings: { topicName: 'walkeros-events' },
      setup: {
        subscriptions: [
          {
            protocol: 'sqs' as const,
            endpoint: 'arn:aws:sqs:eu-central-1:111111111111:walkeros-events-q',
          },
        ],
      },
    };
    await setup({ id: 'sns', config: settingsConfig, env, logger });
    __resetMock();
    __resetStsMock();
    __setStsHarness({ accountId: '111111111111' });
    __resetAccountIdCache();
    const result = await setup({
      id: 'sns',
      config: settingsConfig,
      env,
      logger,
    });
    expect(result?.subscriptionsCreated).toBe(1);
  });

  test('non-declared subscription is left untouched and not listed', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const arn = 'arn:aws:sns:eu-central-1:111111111111:walkeros-events';
    __setHarness({
      topics: { [arn]: { topicArn: arn } },
      subscriptions: {
        [arn]: [
          {
            SubscriptionArn: `${arn}:sub-pre`,
            Protocol: 'email',
            Endpoint: 'ops@example.com',
          },
        ],
      },
    });
    const logger = createMockLogger();
    await setup({
      id: 'sns',
      config: {
        settings: { topicName: 'walkeros-events' },
        setup: { subscriptions: [] },
      },
      env,
      logger,
    });

    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).not.toContain('ListSubscriptionsByTopic');
    expect(methods).not.toContain('Unsubscribe');
  });

  test('non-declared tag is left untouched, no tag listing', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const arn = 'arn:aws:sns:eu-central-1:111111111111:walkeros-events';
    __setHarness({
      topics: { [arn]: { topicArn: arn, tags: { existing: 'preserve' } } },
    });
    const logger = createMockLogger();
    await setup({
      id: 'sns',
      config: {
        settings: { topicName: 'walkeros-events' },
        setup: { tags: { env: 'prod' } },
      },
      env,
      logger,
    });

    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).not.toContain('ListTagsForResource');
    expect(methods).not.toContain('UntagResource');
  });

  test('setup: false short-circuits with no SDK calls', async () => {
    const logger = createMockLogger();
    const result = await setup({
      id: 'sns',
      config: {
        settings: { topicName: 'walkeros-events' },
        setup: false,
      },
      env,
      logger,
    });
    expect(result).toBeUndefined();
    expect(__getMockCalls()).toEqual([]);
    expect(__getStsMockCalls()).toEqual([]);
  });

  test('setup: true with no topicName throws', async () => {
    const logger = createMockLogger();
    await expect(
      setup({
        id: 'sns',
        config: { settings: { topicName: '' }, setup: true },
        env,
        logger,
      }),
    ).rejects.toThrow(/topicName/);
  });

  test('setup: true with defaults uses eu-central-1, no extras', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const logger = createMockLogger();
    await setup({
      id: 'sns',
      config: {
        settings: { topicName: 'walkeros-events' },
        setup: true,
      },
      env,
      logger,
    });

    const create = __getMockCalls().find((c) => c.method === 'CreateTopic');
    expect(create?.input).toEqual({ Name: 'walkeros-events' });
  });

  test('returns structured result with all four fields', async () => {
    __setStsHarness({ accountId: '111111111111' });
    const logger = createMockLogger();
    const result = await setup({
      id: 'sns',
      config: {
        settings: { topicName: 'walkeros-events' },
        setup: {
          tags: { env: 'prod' },
          subscriptions: [
            {
              protocol: 'sqs',
              endpoint:
                'arn:aws:sqs:eu-central-1:111111111111:walkeros-events-q',
            },
          ],
        },
      },
      env,
      logger,
    });

    expect(result).toEqual({
      topicArn: expect.any(String),
      topicCreated: true,
      tagsApplied: 1,
      subscriptionsCreated: 1,
    });
  });
});
