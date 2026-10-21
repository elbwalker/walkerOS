// Tests that push() surfaces an actionable error when the broker rejects
// the produce call because the topic does not exist (kafkajs throws
// KafkaJSProtocolError with code 3 / type UNKNOWN_TOPIC_OR_PARTITION).
// The push must fail with a message pointing the operator at
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
  it('fails with the walkeros setup hint on UNKNOWN_TOPIC_OR_PARTITION', async () => {
    const send = jest.fn().mockRejectedValue(makeUnknownTopicError());
    const producer = makeProducer(send);
    const logger = createMockLogger();
    const context = createMockContext({
      config: makeConfig(producer),
      logger,
      id: 'kafka',
    });

    await expect(push(getEvent(), context)).rejects.toMatchObject({
      name: 'StepError',
      code: 'config',
      retryable: false,
      message: expect.stringContaining(
        'Kafka topic "walkeros-events" not found on cluster kafka1:9092,kafka2:9092',
      ),
    });
    expect(send).toHaveBeenCalledTimes(1);
    // The collector writes the one line.
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('fails with transport on unrelated errors', async () => {
    const unrelated = new Error('socket reset');
    const send = jest.fn().mockRejectedValue(unrelated);
    const producer = makeProducer(send);
    const logger = createMockLogger();
    const context = createMockContext({
      config: makeConfig(producer),
      logger,
      id: 'kafka',
    });

    await expect(push(getEvent(), context)).rejects.toMatchObject({
      code: 'transport',
      message: 'Kafka push failed',
      cause: unrelated,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each([
    [
      'an error no retry fixes (MESSAGE_TOO_LARGE)',
      Object.assign(new Error('message too large'), {
        name: 'KafkaJSNonRetriableError',
        retriable: false,
      }),
      false,
    ],
    [
      'retries run out on a retried error',
      Object.assign(new Error('broker not available'), {
        name: 'KafkaJSNumberOfRetriesExceeded',
        retriable: false,
        retryCount: 5,
      }),
      true,
    ],
  ])('takes kafkajs retriable for %s', async (_name, error, retryable) => {
    const producer = makeProducer(() => Promise.reject(error));
    const context = createMockContext({
      config: makeConfig(producer),
      logger: createMockLogger(),
      id: 'kafka',
    });

    await expect(push(getEvent(), context)).rejects.toMatchObject({
      code: 'transport',
      retryable,
      cause: error,
    });
  });

  it('connects once, at the first push', async () => {
    const connect = jest.fn().mockResolvedValue(undefined);
    const producer = { ...makeProducer(() => Promise.resolve([])), connect };
    const context = createMockContext({
      config: makeConfig(producer),
      logger: createMockLogger(),
      id: 'kafka',
    });

    await push(getEvent(), context);
    await push(getEvent(), context);

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('fails a push whose connect fails, and connects again at the next', async () => {
    const connect = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue(undefined);
    const producer = { ...makeProducer(() => Promise.resolve([])), connect };
    const context = createMockContext({
      config: makeConfig(producer),
      logger: createMockLogger(),
      id: 'kafka',
    });

    await expect(push(getEvent(), context)).rejects.toMatchObject({
      code: 'transport',
      message: 'Kafka producer connect failed',
    });
    await expect(push(getEvent(), context)).resolves.toBeUndefined();
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
