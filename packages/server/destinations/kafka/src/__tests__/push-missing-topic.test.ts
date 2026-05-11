// Tests that push() surfaces an actionable error when the broker rejects
// the produce call because the topic does not exist (kafkajs throws
// KafkaJSProtocolError with code 3 / type UNKNOWN_TOPIC_OR_PARTITION).
// The destination must log a message pointing the operator at
// `walkeros setup destination.<id>` instead of swallowing the failure.

import { createMockContext, createMockLogger, getEvent } from '@walkeros/core';
import { push } from '../push';
import type {
  Config,
  KafkaProducerMock,
  ProducerRecord,
  Settings,
} from '../types';

interface KafkaProtocolError extends Error {
  type: string;
  code: number;
}

function makeUnknownTopicError(): KafkaProtocolError {
  return Object.assign(new Error('topic not found'), {
    name: 'KafkaJSProtocolError',
    type: 'UNKNOWN_TOPIC_OR_PARTITION',
    code: 3,
  });
}

function makeProducer(
  send: (record: ProducerRecord) => Promise<unknown>,
): KafkaProducerMock {
  return {
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    send,
  };
}

function makeConfig(producer: KafkaProducerMock): Config {
  const settings: Settings = {
    kafka: {
      brokers: ['kafka1:9092', 'kafka2:9092'],
      topic: 'walkeros-events',
      _producer: producer,
    },
  };
  return { settings };
}

describe('push: actionable error when topic missing', () => {
  it('logs walkeros setup hint on UNKNOWN_TOPIC_OR_PARTITION', async () => {
    const send = jest.fn().mockRejectedValue(makeUnknownTopicError());
    const producer = makeProducer(send);
    const logger = createMockLogger();
    const context = createMockContext({
      config: makeConfig(producer),
      logger,
      id: 'kafka',
    });

    await push(getEvent(), context);

    expect(send).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);

    const [message, meta] = logger.error.mock.calls[0];
    expect(typeof message).toBe('string');
    expect(message).toContain('walkeros-events');
    expect(message).toContain('walkeros setup destination.kafka');

    expect(meta).toMatchObject({
      topic: 'walkeros-events',
      brokers: 'kafka1:9092,kafka2:9092',
    });
  });

  it('logs the original kafka push failure on unrelated errors', async () => {
    const unrelated = new Error('socket reset');
    const send = jest.fn().mockRejectedValue(unrelated);
    const producer = makeProducer(send);
    const logger = createMockLogger();
    const context = createMockContext({
      config: makeConfig(producer),
      logger,
      id: 'kafka',
    });

    await push(getEvent(), context);

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [message, meta] = logger.error.mock.calls[0];
    expect(message).toBe('Kafka push failed');
    expect(meta).toMatchObject({ error: 'socket reset' });
  });
});
