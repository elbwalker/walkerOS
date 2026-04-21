import type { Destination as CoreDestination } from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';

/**
 * Mock-friendly Producer interface used by the destination.
 * Tests provide this via env.Kafka; production creates a real
 * kafkajs Producer and adapts it through settings._producer.
 */
export interface KafkaProducerMock {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  send: (record: ProducerRecord) => Promise<unknown>;
}

/**
 * Mock-friendly Kafka client interface (subset of kafkajs.Kafka).
 */
export interface KafkaClientMock {
  producer: (config?: ProducerConfig) => KafkaProducerMock;
}

/**
 * Constructor signature for the Kafka client. Accepts a config
 * object and returns a client with producer() factory.
 */
export type KafkaClientConstructor = new (
  config: KafkaClientConfig,
) => KafkaClientMock;

export interface KafkaClientConfig {
  clientId?: string;
  brokers: string[];
  ssl?: boolean | Record<string, unknown>;
  sasl?: SASLConfig;
  connectionTimeout?: number;
  requestTimeout?: number;
  retry?: RetryConfig;
}

export interface ProducerConfig {
  allowAutoTopicCreation?: boolean;
  idempotent?: boolean;
}

export interface ProducerRecord {
  topic: string;
  messages: ProducerMessage[];
  acks?: number;
  compression?: number;
  timeout?: number;
}

export interface ProducerMessage {
  key?: string;
  value: string;
  headers?: Record<string, string>;
  timestamp?: string;
  partition?: number;
}

export interface CompressionTypesMap {
  None: number;
  GZIP: number;
  Snappy: number;
  LZ4: number;
  ZSTD: number;
}

export type CompressionType = 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';

export interface SASLConfig {
  mechanism:
    | 'plain'
    | 'scram-sha-256'
    | 'scram-sha-512'
    | 'aws'
    | 'oauthbearer';
  username?: string;
  password?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  authorizationIdentity?: string;
}

export interface RetryConfig {
  maxRetryTime?: number;
  initialRetryTime?: number;
  retries?: number;
}

export interface KafkaSettings {
  // Connection
  brokers: string[];
  clientId?: string;
  ssl?: boolean | Record<string, unknown>;
  sasl?: SASLConfig;
  connectionTimeout?: number;
  requestTimeout?: number;

  // Producer
  topic: string;
  acks?: number;
  timeout?: number;
  compression?: CompressionType;
  idempotent?: boolean;
  allowAutoTopicCreation?: boolean;

  // Message
  key?: string;
  headers?: Record<string, string>;

  // Advanced
  retry?: RetryConfig;

  // Runtime -- set during init, not user-facing
  _producer?: KafkaProducerMock;
}

export interface Settings {
  kafka: KafkaSettings;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  /** Override message key mapping path for this rule. */
  key?: string;
  /** Override topic for this rule. */
  topic?: string;
}

/**
 * Env -- optional Kafka SDK override. Production leaves this undefined
 * and the destination creates real Kafka client instances. Tests provide
 * mocks via env.Kafka.
 */
export interface Env extends DestinationServer.Env {
  Kafka?: {
    Kafka: KafkaClientConstructor;
    CompressionTypes: CompressionTypesMap;
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type PartialConfig = DestinationServer.PartialConfig<Types>;
export type PushEvents = DestinationServer.PushEvents<Mapping>;
