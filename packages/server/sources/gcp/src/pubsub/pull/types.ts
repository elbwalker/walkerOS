import type {
  Source as CoreSource,
  SetupFn as CoreSetupFn,
} from '@walkeros/core';
import type { PubSub, Subscription } from '@google-cloud/pubsub';
import type { Decoder, ServiceAccountCredentials } from '../shared/types';

declare module '@walkeros/core' {
  interface SourceMap {
    'pubsub-pull': { type: 'pubsub-pull'; platform: 'server' };
  }
}

export interface Settings {
  // User-supplied OR populated by getConfig(); single field for both. Mirrors the destination.
  client: PubSub;
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
  // Runtime-only handle populated by init(); not user-facing.
  subscriptionHandle?: Subscription;
}

export interface InitSettings {
  projectId: string;
  subscription: string;
  topic?: string;
  client?: PubSub;
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
  PubSub?: typeof PubSub;
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

// Re-export shared domain types for consumer convenience.
export type { Decoder, ServiceAccountCredentials } from '../shared/types';

// Re-export SDK types used in this package's public surface.
export type { PubSub, Subscription };
