jest.mock('kafkajs', () => ({
  __esModule: true,
  Kafka: class {
    constructor(_config: unknown) {}
    producer() {
      return {
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
        send: () => Promise.resolve([]),
      };
    }
  },
}));

import { destinationKafka } from '..';
import type { Settings } from '../types';

function makeLogger() {
  return {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    throw: jest.fn((msg: string) => {
      throw new Error(msg);
    }),
  };
}

describe('init', () => {
  it('throws when brokers are missing', async () => {
    const logger = makeLogger();

    await expect(
      destinationKafka.init!({
        config: { settings: { kafka: { topic: 'test' } } },
        logger,
        id: 'test',
      } as never),
    ).rejects.toThrow('brokers');
  });

  it('throws when topic is missing', async () => {
    const logger = makeLogger();

    await expect(
      destinationKafka.init!({
        config: { settings: { kafka: { brokers: ['localhost:9092'] } } },
        logger,
        id: 'test',
      } as never),
    ).rejects.toThrow('topic');
  });

  it('creates and connects a producer on valid config', async () => {
    const logger = makeLogger();
    const result = await destinationKafka.init!({
      config: {
        settings: {
          kafka: { brokers: ['localhost:9092'], topic: 'walkeros-events' },
        },
      },
      logger,
      id: 'test',
    } as never);

    const settings = (result as { settings: Settings }).settings;
    expect(settings.kafka._producer).toBeDefined();
  });
});

describe('destroy', () => {
  it('calls producer.disconnect and clears the reference', async () => {
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const settings: Settings = {
      kafka: {
        brokers: ['localhost:9092'],
        topic: 'walkeros-events',
        _producer: {
          connect: () => Promise.resolve(),
          disconnect,
          send: () => Promise.resolve([]),
        },
      },
    };

    await destinationKafka.destroy!({ config: { settings } } as never);

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(settings.kafka._producer).toBeUndefined();
  });

  it('does nothing when no producer exists', async () => {
    const settings: Settings = {
      kafka: { brokers: ['localhost:9092'], topic: 'walkeros-events' },
    };
    // Should not throw
    await destinationKafka.destroy!({ config: { settings } } as never);
  });
});
