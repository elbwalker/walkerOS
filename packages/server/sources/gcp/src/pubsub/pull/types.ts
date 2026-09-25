import type {
  Source as CoreSource,
  SetupFn as CoreSetupFn,
  Credential,
  ServiceAccount,
} from '@walkeros/core';
import type {
  ClientConfig,
  CreateSubscriptionOptions,
  Message,
  PubSub,
  Subscription,
  SubscriptionOptions,
  TopicMetadata,
  protos,
} from '@google-cloud/pubsub';
import type { Decoder, ServiceAccountCredentials } from '../shared/types';

declare module '@walkeros/core' {
  interface SourceMap {
    'pubsub-pull': { type: 'pubsub-pull'; platform: 'server' };
  }
}

/** The part of a Pub/Sub subscription the pull source drives. */
export interface PullSubscription {
  on(event: 'message', listener: (message: Message) => void): unknown;
  on(event: 'error', listener: (error: Error) => void): unknown;
  close(): Promise<void>;
}

/**
 * The part of a Pub/Sub client the pull source calls at runtime. `PubSub` from
 * `@google-cloud/pubsub` satisfies it, and so does an injected mock (tests,
 * simulate) without a cast. Setup needs a `PubSubAdminClient`.
 */
export interface PubSubPullClient {
  subscription(name: string, options?: SubscriptionOptions): PullSubscription;
  close(): Promise<void>;
}

/**
 * The part of a Pub/Sub client `walkeros setup` calls (topic and subscription
 * provisioning, drift check). `PubSub` from `@google-cloud/pubsub` satisfies
 * it, from any copy of the SDK; a pull-only client does not.
 */
export interface PubSubAdminClient {
  topic(name: string): { exists(): Promise<[boolean, ...unknown[]]> };
  createTopic(metadata: TopicMetadata): Promise<unknown>;
  createSubscription(
    topic: string,
    name: string,
    options?: CreateSubscriptionOptions,
  ): Promise<unknown>;
  subscription(name: string): {
    getMetadata(): Promise<
      [protos.google.pubsub.v1.ISubscription, ...unknown[]]
    >;
  };
}

export interface Settings {
  // User-supplied OR populated by getConfig(); single field for both. Mirrors the destination.
  client: PubSubPullClient;
  // Top-level always wins over credentials.project_id.
  projectId: string;
  // Subscription short name. Required.
  subscription: string;
  // Topic short name. Optional at runtime; required when setup.createTopic is true.
  topic?: string;
  /** @deprecated Use `config.credentials` instead. Kept for back-compat. */
  credentials?: string | ServiceAccountCredentials;
  // SDK term, kept verbatim. Honors PUBSUB_EMULATOR_HOST automatically.
  apiEndpoint?: string;
  // Decoder for message data. Default: 'json'.
  decoder?: Decoder;
  // Subscriber flow control. Defaults: { maxMessages: 100, maxBytes: 10 MB }.
  flowControl?: {
    maxMessages?: number;
    maxBytes?: number;
  };
  // Subscriber ack deadline in seconds. Default: 60.
  ackDeadline?: number;
  // Graceful shutdown timeout in milliseconds. Default: 30000.
  shutdownTimeoutMs?: number;
  // Behavior on push errors: 'nack' (redeliver) or 'ack' (drop). Default: 'nack'.
  onPushError?: 'nack' | 'ack';
  // Runtime-only handle populated by init(); not user-facing.
  subscriptionHandle?: PullSubscription;
}

export interface InitSettings {
  projectId: string;
  subscription: string;
  topic?: string;
  client?: PubSubPullClient;
  /** @deprecated Use `config.credentials` instead. Kept for back-compat. */
  credentials?: string | ServiceAccountCredentials;
  apiEndpoint?: string;
  decoder?: Decoder;
  flowControl?: { maxMessages?: number; maxBytes?: number };
  ackDeadline?: number;
  shutdownTimeoutMs?: number;
  onPushError?: 'nack' | 'ack';
}

export interface Mapping {
  // Reserved for future use.
}

/**
 * Synthetic message input. Used by tests / triggers to dispatch a message
 * through the same handler the SDK subscriber callback uses, without
 * involving real Pub/Sub infrastructure.
 *
 * In production, `push()` is invoked without arguments and is a no-op:
 * Pub/Sub is event-driven, the SDK's subscription emitter is the canonical
 * delivery path. Tests pass a synthetic input to dispatch directly.
 */
export interface SyntheticMessage {
  id: string;
  data: Buffer;
  attributes?: Record<string, string>;
  orderingKey?: string;
}

export interface SyntheticPushResult {
  acked: boolean;
  nacked: boolean;
}

export type Push = (
  content?: SyntheticMessage,
) => Promise<SyntheticPushResult | void>;

export interface Env extends CoreSource.Env {
  PubSub?: new (options?: ClientConfig) => PubSubPullClient;
}

/**
 * Provisioning options for `walkeros setup source.<id>`.
 *
 * Triggered only by the explicit CLI command. Idempotent. Never auto-run.
 */
export interface Setup {
  /** Optional: create the topic if it does not exist. Default: false (require pre-existing topic). */
  createTopic?: boolean;
  /** Subscription ack deadline in seconds. Default: 60. */
  ackDeadlineSeconds?: number;
  /** Subscription message retention. Default: undefined (project default). */
  messageRetentionDuration?: { seconds: number };
  /** Filter expression. Optional. */
  filter?: string;
  /** Dead-letter policy. Optional but strongly recommended. */
  deadLetterPolicy?: {
    deadLetterTopic: string;
    maxDeliveryAttempts: number;
    /** Auto-create the dead-letter topic if it does not exist. Default: false. */
    createDeadLetterTopic?: boolean;
  };
  /** Retry policy. Optional. */
  retryPolicy?: {
    minimumBackoff: { seconds: number };
    maximumBackoff: { seconds: number };
  };
  /** Enable message ordering on the subscription. Default: false. */
  enableMessageOrdering?: boolean;
  /** Subscription labels. Optional. */
  labels?: Record<string, string>;
  /** Subscription expiration policy. `null` means never expire. */
  expirationPolicy?: { ttl?: { seconds: number } | null };
}

// Source.Types slots: <Settings, Mapping, Push, Env, InitSettings, Setup, Credentials>.
export type Types = CoreSource.Types<
  Settings,
  Mapping,
  Push,
  Env,
  InitSettings,
  Setup,
  Credential<ServiceAccount>
>;

export type Config = CoreSource.Config<Types>;
export type PartialConfig = CoreSource.PartialConfig<Types>;
export type SetupFn = CoreSetupFn<Config, Env>;

// Re-export shared domain types for consumer convenience.
export type { Decoder, ServiceAccountCredentials } from '../shared/types';

// Re-export SDK types used in this package's public surface.
export type { PubSub, Subscription };
