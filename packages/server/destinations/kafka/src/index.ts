import type {
  Destination,
  Settings,
  Env,
  KafkaClientMock,
  KafkaClientConfig,
  KafkaClientConstructor,
  ProducerConfig,
} from './types';
import { getConfig, isKafkaEnv } from './config';
import { push } from './push';
import { setup } from './setup';

// Types re-export
export * as DestinationKafka from './types';

export const destinationKafka: Destination = {
  type: 'kafka',

  config: {},

  setup,

  async init({ config: partialConfig, logger, env }) {
    const config = getConfig(partialConfig, logger);
    const settings = config.settings as Settings;
    const kafka = settings.kafka;

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
        logger.throw(`Failed to load kafkajs: ${String(err)}`);
        return config;
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

    const producer = client.producer(producerConfig);

    try {
      await producer.connect();
    } catch (err) {
      logger.error('Kafka producer connect failed', { error: String(err) });
      logger.throw(`Kafka producer connect failed: ${String(err)}`);
      return config;
    }

    kafka._producer = producer;

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },

  async destroy({ config }) {
    const settings = config?.settings as Settings | undefined;
    const producer = settings?.kafka?._producer;
    if (producer) {
      try {
        await producer.disconnect();
      } finally {
        settings.kafka._producer = undefined;
      }
    }
  },
};

export default destinationKafka;
