jest.mock('@google-cloud/pubsub');

import { PubSub } from '@google-cloud/pubsub';
import {
  __getMockCalls,
  __resetMockCalls,
  __setTopicHarness,
  __setCreateTopicHarness,
} from '@google-cloud/pubsub';
import { createMockLogger } from '@walkeros/core';
import { setup, DEFAULT_SETUP } from '../setup';

const env = {};

describe('Pub/Sub setup', () => {
  beforeEach(() => {
    __resetMockCalls();
  });

  function makeClient() {
    return new PubSub();
  }

  test('skipped when config.setup is undefined', async () => {
    const logger = createMockLogger();
    const result = await setup({
      id: 'pubsub',
      config: {
        settings: {
          projectId: 'p',
          topic: 'events',
          client: makeClient(),
        },
      },
      env,
      logger,
    });
    expect(result).toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('skipped'),
    );
  });

  test('skipped when config.setup is false', async () => {
    const logger = createMockLogger();
    const result = await setup({
      id: 'pubsub',
      config: {
        settings: {
          projectId: 'p',
          topic: 'events',
          client: makeClient(),
        },
        setup: false,
      },
      env,
      logger,
    });
    expect(result).toBeUndefined();
  });

  test('creates topic via client.createTopic({name, messageStoragePolicy}) when topic does not exist', async () => {
    __setTopicHarness({ exists: false });
    const client = makeClient();

    const logger = createMockLogger();
    const result = await setup({
      id: 'pubsub',
      config: {
        settings: { projectId: 'p', topic: 'events', client },
        setup: true,
      },
      env,
      logger,
    });

    expect(result).toEqual({ topicCreated: true });

    // Verify the SDK was called via createTopic (not topic.create which
    // silently drops metadata) and the metadata includes messageStoragePolicy.
    const createCall = __getMockCalls().find((c) => c.method === 'createTopic');
    expect(createCall).toBeDefined();
    if (!createCall) return;
    const [metadata] = createCall.args;
    expect(metadata).toEqual({
      name: 'projects/p/topics/events',
      messageStoragePolicy: DEFAULT_SETUP.messageStoragePolicy,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('idempotent: ALREADY_EXISTS on createTopic is non-fatal', async () => {
    __setTopicHarness({ exists: false });
    __setCreateTopicHarness({
      error: Object.assign(new Error('Already Exists'), { code: 6 }),
    });
    const client = makeClient();

    const logger = createMockLogger();
    const result = await setup({
      id: 'pubsub',
      config: {
        settings: { projectId: 'p', topic: 'events', client },
        setup: true,
      },
      env,
      logger,
    });

    // We tried to create and the race told us it already existed; we did
    // not actually create it.
    expect(result).toEqual({ topicCreated: false });
    expect(logger.debug).toHaveBeenCalledWith(
      'setup: topic already exists (race)',
      expect.objectContaining({ topic: 'events' }),
    );
  });

  test('topicCreated false when the topic already exists, runs drift check', async () => {
    __setTopicHarness({
      exists: true,
      metadata: {
        messageStoragePolicy: {
          allowedPersistenceRegions: [
            'europe-west1',
            'europe-west3',
            'europe-west4',
          ],
        },
      },
    });
    const client = makeClient();

    const logger = createMockLogger();
    const result = await setup({
      id: 'pubsub',
      config: {
        settings: { projectId: 'p', topic: 'events', client },
        setup: true,
      },
      env,
      logger,
    });

    expect(result).toEqual({ topicCreated: false });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('drift detection: mismatched allowedPersistenceRegions emits warn', async () => {
    __setTopicHarness({
      exists: true,
      metadata: {
        messageStoragePolicy: {
          allowedPersistenceRegions: ['us-central1'],
        },
      },
    });
    const client = makeClient();

    const logger = createMockLogger();
    await setup({
      id: 'pubsub',
      config: {
        settings: { projectId: 'p', topic: 'events', client },
        setup: true,
      },
      env,
      logger,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'setup.drift',
      expect.objectContaining({
        field: 'messageStoragePolicy.allowedPersistenceRegions',
        declared: ['europe-west1', 'europe-west3', 'europe-west4'],
        actual: ['us-central1'],
      }),
    );
  });

  test('throws when settings.projectId is missing', async () => {
    const client = makeClient();
    const logger = createMockLogger();
    await expect(
      setup({
        id: 'pubsub',
        config: {
          settings: { projectId: '', topic: 'events', client },
          setup: true,
        },
        env,
        logger,
      }),
    ).rejects.toThrow('projectId is missing');
  });

  test('throws when settings.topic is missing', async () => {
    const client = makeClient();
    const logger = createMockLogger();
    await expect(
      setup({
        id: 'pubsub',
        config: {
          settings: { projectId: 'p', topic: '', client },
          setup: true,
        },
        env,
        logger,
      }),
    ).rejects.toThrow('topic is missing');
  });
});
