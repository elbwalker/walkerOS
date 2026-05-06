import type {
  Env,
  KafkaAdminMock,
  KafkaClientConstructor,
  KafkaClientMock,
  KafkaProducerMock,
  ProducerRecord,
  ProducerConfig,
  KafkaClientConfig,
  CompressionTypesMap,
} from '../types';

// Narrow helper type aliases so the mock SDK is typed explicitly without `any`.
type ProducerConnect = () => Promise<void>;
type ProducerDisconnect = () => Promise<void>;
type ProducerSend = (record: ProducerRecord) => Promise<unknown>;
type KafkaProducerFactory = (config?: ProducerConfig) => KafkaProducerMock;

const asyncConnect: ProducerConnect = () => Promise.resolve();
const asyncDisconnect: ProducerDisconnect = () => Promise.resolve();
const asyncSend: ProducerSend = () => Promise.resolve([]);

function createMockProducer(): KafkaProducerMock {
  return {
    connect: asyncConnect,
    disconnect: asyncDisconnect,
    send: asyncSend,
  };
}

const mockProducerFactory: KafkaProducerFactory = () => createMockProducer();

function createMockAdmin(): KafkaAdminMock {
  return {
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    createTopics: () => Promise.resolve(true),
    fetchTopicMetadata: ({ topics }) =>
      Promise.resolve({
        topics: (topics ?? []).map((name) => ({
          name,
          partitions: [{ partitionId: 0, leader: 0, replicas: [0], isr: [0] }],
        })),
      }),
    describeConfigs: ({ resources }) =>
      Promise.resolve({
        resources: resources.map((r) => ({
          resourceName: r.name,
          configEntries: [],
        })),
      }),
  };
}

class MockKafkaClient implements KafkaClientMock {
  constructor(_config: KafkaClientConfig) {}
  producer(config?: ProducerConfig): KafkaProducerMock {
    return mockProducerFactory(config);
  }
  admin(): KafkaAdminMock {
    return createMockAdmin();
  }
}

const MockKafkaConstructor: KafkaClientConstructor = MockKafkaClient;

const MockCompressionTypes: CompressionTypesMap = {
  None: 0,
  GZIP: 1,
  Snappy: 2,
  LZ4: 3,
  ZSTD: 4,
};

export const push: Env = {
  Kafka: {
    Kafka: MockKafkaConstructor,
    CompressionTypes: MockCompressionTypes,
  },
};

export const simulation = ['call:producer.send'];
