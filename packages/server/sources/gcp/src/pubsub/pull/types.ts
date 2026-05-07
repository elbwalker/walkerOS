import type {
  Source as CoreSource,
  SetupFn as CoreSetupFn,
} from '@walkeros/core';
import type {
  Decoder,
  PubSubConstructor,
  PubSubLike,
  ServiceAccountCredentials,
  SubscriberOptions,
  SubscriptionLike,
} from '../shared/types';

declare module '@walkeros/core' {
  interface SourceMap {
    'pubsub-pull': { type: 'pubsub-pull'; platform: 'server' };
  }
}

export interface Settings {
  // User-supplied OR populated by init(); single field for both. Mirrors the destination.
  client: PubSubLike;
  // Top-level always wins over credentials.project_id.
  projectId: string;
  // Subscription short name. Required.
  subscription: string;
  // Topic short name. Optional at runtime; required when setup.createTopic is true.
  topic?: string;
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
  // Runtime-only handles populated by init(); not user-facing.
  subscriptionHandle?: SubscriptionLike;
}

export interface InitSettings {
  projectId: string;
  subscription: string;
  topic?: string;
  client?: PubSubLike;
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

// Pull source has no external invocation; push is a no-op stub.
export type Push = () => Promise<void>;

export interface Env extends CoreSource.Env {
  PubSub?: PubSubConstructor;
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

// Source.Types has 6 slots: <Settings, Mapping, Push, Env, InitSettings, Setup>.
export type Types = CoreSource.Types<
  Settings,
  Mapping,
  Push,
  Env,
  InitSettings,
  Setup
>;

export type Config = CoreSource.Config<Types>;
export type PartialConfig = CoreSource.PartialConfig<Types>;
export type SetupFn = CoreSetupFn<Config, Env>;

// Re-export shared types for consumer convenience.
export type {
  Decoder,
  PubSubConstructor,
  PubSubLike,
  ServiceAccountCredentials,
  SubscriberOptions,
  SubscriptionLike,
} from '../shared/types';
