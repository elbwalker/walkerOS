jest.mock('kafkajs');

import { createMockLogger } from '@walkeros/core';
import { setup } from '../setup';
import type { Config, Env, Setup } from '../types';
import {
  __setKafkaSetupHarness,
  __resetKafkaSetupHarness,
  __getAdminCalls,
} from 'kafkajs';

const env: Env = {};

function makeConfig(setupOverrides: Partial<Setup> = {}): Config {
  const setupOptions: Setup = {
    topic: 'walkeros-events',
    numPartitions: 6,
    replicationFactor: 3,
    ...setupOverrides,
  };
  return {
    settings: {
      kafka: {
        brokers: ['localhost:9092'],
        topic: 'walkeros-events',
      },
    },
    setup: setupOptions,
  };
}

interface CreateTopicEntry {
  topic: string;
  numPartitions: number;
  replicationFactor: number;
  configEntries?: Array<{ name: string; value: string }>;
}

interface CreateTopicArgs {
  topics: CreateTopicEntry[];
  validateOnly: boolean;
}

function isCreateTopicEntry(v: unknown): v is CreateTopicEntry {
  if (typeof v !== 'object' || v === null) return false;
  const o: {
    topic?: unknown;
    numPartitions?: unknown;
    replicationFactor?: unknown;
  } = v;
  return (
    typeof o.topic === 'string' &&
    typeof o.numPartitions === 'number' &&
    typeof o.replicationFactor === 'number'
  );
}

function isCreateTopicsArgs(v: unknown): v is CreateTopicArgs {
  if (typeof v !== 'object' || v === null) return false;
  const o: { topics?: unknown; validateOnly?: unknown } = v;
  if (!Array.isArray(o.topics)) return false;
  if (typeof o.validateOnly !== 'boolean') return false;
  return o.topics.every(isCreateTopicEntry);
}

function getCreateTopicsArgs(): CreateTopicArgs {
  const calls = __getAdminCalls();
  const create = calls.find((c) => c.method === 'createTopics');
  if (!create) {
    throw new Error('expected createTopics call, none recorded');
  }
  if (!isCreateTopicsArgs(create.args)) {
    throw new Error('createTopics args do not match expected shape');
  }
  return create.args;
}

describe('kafka setup', () => {
  beforeEach(() => {
    __resetKafkaSetupHarness();
  });

  // The focal idiom: NO SAFE DEFAULTS.
  test('throws on `setup: true` (boolean form is invalid)', async () => {
    const logger = createMockLogger();
    const config: Config = {
      settings: { kafka: { brokers: ['b:9092'], topic: 't' } },
      setup: true,
    };
    await expect(setup({ id: 'kafka', config, env, logger })).rejects.toThrow(
      /requires explicit options.*numPartitions.*replicationFactor.*no safe default/i,
    );
  });

  test('throws on `setup: { numPartitions: 6 }` (replicationFactor missing)', async () => {
    const logger = createMockLogger();
    const config: Config = {
      settings: { kafka: { brokers: ['b:9092'], topic: 't' } },
      setup: { topic: 't', numPartitions: 6 },
    };
    await expect(setup({ id: 'kafka', config, env, logger })).rejects.toThrow(
      /replicationFactor/,
    );
  });

  test('creates topic with explicit options', async () => {
    __setKafkaSetupHarness({ topicExists: false });
    const logger = createMockLogger();

    const result = await setup({
      id: 'kafka',
      config: makeConfig(),
      env,
      logger,
    });

    expect(result).toEqual({ topicCreated: true, schemaRegistered: false });
    const args = getCreateTopicsArgs();
    expect(args.validateOnly).toBe(false);
    expect(args.topics).toEqual([
      {
        topic: 'walkeros-events',
        numPartitions: 6,
        replicationFactor: 3,
      },
    ]);
  });

  test('passes configEntries through as { name, value } pairs', async () => {
    __setKafkaSetupHarness({ topicExists: false });
    const logger = createMockLogger();

    await setup({
      id: 'kafka',
      config: makeConfig({
        configEntries: {
          'retention.ms': '604800000',
          'cleanup.policy': 'delete',
        },
      }),
      env,
      logger,
    });

    const args = getCreateTopicsArgs();
    expect(args.topics[0].configEntries).toEqual([
      { name: 'retention.ms', value: '604800000' },
      { name: 'cleanup.policy', value: 'delete' },
    ]);
  });

  test('idempotent: catches TopicAlreadyExistsError (code 36) and treats as success', async () => {
    __setKafkaSetupHarness({
      topicExists: false,
      createTopicsError: { type: 'TopicAlreadyExistsError', code: 36 },
      // After error, topic effectively exists for drift check.
      postErrorTopicExists: true,
      partitionCount: 6,
      replicationFactor: 3,
    });
    const logger = createMockLogger();

    const result = await setup({
      id: 'kafka',
      config: makeConfig(),
      env,
      logger,
    });

    expect(result).toEqual({ topicCreated: false, schemaRegistered: false });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('drift WARN when actual numPartitions differs from declared', async () => {
    __setKafkaSetupHarness({
      topicExists: true,
      partitionCount: 12, // actual
      replicationFactor: 3,
    });
    const logger = createMockLogger();

    await setup({
      id: 'kafka',
      config: makeConfig({ numPartitions: 6 }), // declared
      env,
      logger,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'setup.drift',
      expect.objectContaining({
        field: 'numPartitions',
        declared: 6,
        actual: 12,
      }),
    );
  });

  test('drift WARN when actual replicationFactor differs from declared', async () => {
    __setKafkaSetupHarness({
      topicExists: true,
      partitionCount: 6,
      replicationFactor: 1, // actual
    });
    const logger = createMockLogger();

    await setup({
      id: 'kafka',
      config: makeConfig({ replicationFactor: 3 }), // declared
      env,
      logger,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'setup.drift',
      expect.objectContaining({
        field: 'replicationFactor',
        declared: 3,
        actual: 1,
      }),
    );
  });

  test('drift WARN per mismatched configEntries key', async () => {
    __setKafkaSetupHarness({
      topicExists: true,
      partitionCount: 6,
      replicationFactor: 3,
      configEntries: [
        { configName: 'retention.ms', configValue: '86400000' }, // 1 day
      ],
    });
    const logger = createMockLogger();

    await setup({
      id: 'kafka',
      config: makeConfig({
        configEntries: { 'retention.ms': '604800000' }, // 7 days declared
      }),
      env,
      logger,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'setup.drift',
      expect.objectContaining({
        field: 'configEntries.retention.ms',
        declared: '604800000',
        actual: '86400000',
      }),
    );
  });

  test('validateOnly: true does not create the topic, returns topicCreated: false', async () => {
    __setKafkaSetupHarness({ topicExists: false });
    const logger = createMockLogger();

    const result = await setup({
      id: 'kafka',
      config: makeConfig({ validateOnly: true }),
      env,
      logger,
    });

    expect(result).toEqual({ topicCreated: false, schemaRegistered: false });
    const args = getCreateTopicsArgs();
    expect(args.validateOnly).toBe(true);
  });

  test('schema registry: registers schema and (optionally) sets compatibility', async () => {
    __setKafkaSetupHarness({ topicExists: false });
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 42 }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const logger = createMockLogger();
    const result = await setup({
      id: 'kafka',
      config: makeConfig({
        schemaRegistry: {
          url: 'https://registry.example',
          subject: 'walkeros-events-value',
          schemaType: 'JSON',
          schema: '{"type":"object"}',
          compatibility: 'BACKWARD',
        },
      }),
      env,
      logger,
    });

    expect(result).toEqual({ topicCreated: true, schemaRegistered: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://registry.example/subjects/walkeros-events-value/versions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://registry.example/config/walkeros-events-value',
      expect.objectContaining({ method: 'PUT' }),
    );
    fetchSpy.mockRestore();
  });

  test('schema registry: 409 from POST is treated as success', async () => {
    __setKafkaSetupHarness({
      topicExists: true,
      partitionCount: 6,
      replicationFactor: 3,
    });
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValueOnce(new Response('Conflict', { status: 409 }));
    const logger = createMockLogger();

    const result = await setup({
      id: 'kafka',
      config: makeConfig({
        schemaRegistry: {
          url: 'https://registry.example',
          subject: 'walkeros-events-value',
          schemaType: 'JSON',
          schema: '{}',
        },
      }),
      env,
      logger,
    });

    expect(result.schemaRegistered).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  test('falls back to settings.kafka.topic when setup.topic is omitted', async () => {
    __setKafkaSetupHarness({ topicExists: false });
    const logger = createMockLogger();

    const config: Config = {
      settings: { kafka: { brokers: ['b:9092'], topic: 'fallback-topic' } },
      // setup.topic intentionally absent
      setup: { numPartitions: 6, replicationFactor: 3 },
    };

    await setup({ id: 'kafka', config, env, logger });

    const args = getCreateTopicsArgs();
    expect(args.topics[0].topic).toBe('fallback-topic');
  });

  test('throws when neither setup.topic nor settings.kafka.topic is set', async () => {
    const logger = createMockLogger();
    const config: Config = {
      settings: {
        kafka: {
          brokers: ['b:9092'],
          // intentionally typed without topic via type widening below
          topic: '',
        },
      },
      setup: { numPartitions: 6, replicationFactor: 3 },
    };
    // Empty string topic is treated as missing by the runtime.
    await expect(setup({ id: 'kafka', config, env, logger })).rejects.toThrow(
      /topic/,
    );
  });
});
