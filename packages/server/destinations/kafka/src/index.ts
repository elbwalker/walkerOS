import type {
  Destination,
  Env,
  KafkaClientMock,
  KafkaClientConfig,
  KafkaClientConstructor,
  ProducerConfig,
} from './types';
import { StepError } from '@walkeros/core';
import { getConfig, isKafkaEnv } from './config';
import { push } from './push';
import { setup } from './setup';

// Types re-export
export * as DestinationKafka from './types';

export const destinationKafka: Destination = {
  type: 'kafka',

  config: {},

  setup,

  async init({ config: partialConfig, env }) {
    const config = getConfig(partialConfig);
    const kafka = config.settings.kafka;

    // Skip creation if a producer has already been wired in (testing).
    if (kafka._producer) return config;

    let Constructor: KafkaClientConstructor | undefined;

    // Prefer env-injected constructor (testing, dependency injection).
    if (isKafkaEnv(env)) {
      const envTyped = env as Env;
      Constructor = envTyped.Kafka?.Kafka;
    }

    // Production path: load real kafkajs SDK.
    if (!Constructor) {
      try {
        // Use dynamic require to allow tests to mock via jest.mock('kafkajs').
        const kafkajs = require('kafkajs') as {
          Kafka: KafkaClientConstructor;
        };
        Constructor = kafkajs.Kafka;
      } catch (err) {
        throw new StepError('Failed to load kafkajs', {
          code: 'not-ready',
          cause: err,
        });
      }
    }

    const clientConfig: KafkaClientConfig = {
      clientId: kafka.clientId,
      brokers: kafka.brokers,
      ssl: kafka.ssl,
      sasl: kafka.sasl,
      connectionTimeout: kafka.connectionTimeout,
      requestTimeout: kafka.requestTimeout,
      retry: kafka.retry,
    };

    const client: KafkaClientMock = new Constructor(clientConfig);

    const producerConfig: ProducerConfig = {
      allowAutoTopicCreation: kafka.allowAutoTopicCreation,
      idempotent: kafka.idempotent,
    };

    // The producer connects at the first push, so init stays offline.
    kafka._producer = client.producer(producerConfig);

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },

  async destroy({ config }) {
    const kafka = config?.settings?.kafka;
    const producer = kafka?._producer;
    if (kafka && producer) {
      try {
        await producer.disconnect();
      } finally {
        kafka._producer = undefined;
        kafka._connected = undefined;
      }
    }
  },
};

export default destinationKafka;
