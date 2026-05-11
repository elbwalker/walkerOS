import type {
  Source as CoreSource,
  SetupFn as CoreSetupFn,
} from '@walkeros/core';
import type {
  SQSClient,
  SQSClientConfig,
  Message,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  CreateQueueCommand,
  GetQueueUrlCommand,
  GetQueueAttributesCommand,
} from '@aws-sdk/client-sqs';
import type { SNSClient, SubscribeCommand } from '@aws-sdk/client-sns';

declare module '@walkeros/core' {
  interface SourceMap {
    sqs: { type: 'sqs'; platform: 'server' };
  }
}

export type Decoder = 'json' | 'text' | 'raw';

export interface Settings {
  // User-supplied OR populated by getConfig(); single field for both. Mirrors the Pub/Sub pull source.
  client: SQSClient;
  // Required. Used by setup to provision and by init to resolve the URL.
  queueName: string;
  // AWS region. Default: 'eu-central-1'.
  region?: string;
  // Optional pre-resolved URL. When unset, init resolves via GetQueueUrlCommand.
  queueUrl?: string;
  // SDK client config (credentials, etc.). Optional.
  config?: SQSClientConfig;
  // Decoder for message body. Default: 'json'.
  decoder?: Decoder;
  // Receive batch size. Cap 10, default 10.
  maxMessages?: number;
  // Long-poll duration in seconds. Cap 20, default 20.
  waitTimeSeconds?: number;
  // Per-receive visibility timeout override. Default: queue's configured value.
  visibilityTimeout?: number;
  // Graceful shutdown timeout in ms. Default: 30000.
  shutdownTimeoutMs?: number;
  // Error policy: 'ack' (DeleteMessage to drop) or 'nack' (no DeleteMessage, redeliver). Default: 'nack'.
  onPushError?: 'nack' | 'ack';
  // Runtime-only handle populated by init(); not user-facing.
  queueArn?: string;
}

export interface InitSettings {
  queueName: string;
  client?: SQSClient;
  region?: string;
  queueUrl?: string;
  config?: SQSClientConfig;
  decoder?: Decoder;
  maxMessages?: number;
  waitTimeSeconds?: number;
  visibilityTimeout?: number;
  shutdownTimeoutMs?: number;
  onPushError?: 'nack' | 'ack';
}

// Mapping has no per-event fields in v1: SQS messages have no native ordering
// key, no per-event visibility-extension API, no per-event delete strategy that
// SQS itself consumes. Future per-event fields will be introduced when a real
// feature needs them.
export interface Mapping {
  // Reserved for future use.
}

/**
 * Synthetic message input used by tests / triggers to dispatch through the
 * same handler the long-poll loop uses, without involving real SQS.
 *
 * In production, push() is invoked without arguments and is a no-op:
 * SQS is event-driven, the long-poll loop is the canonical delivery path.
 * Tests pass a synthetic input to dispatch directly.
 */
export interface SyntheticMessage {
  MessageId: string;
  Body: string;
  ReceiptHandle?: string;
  Attributes?: Record<string, string>;
  MessageAttributes?: Record<
    string,
    { DataType: string; StringValue?: string }
  >;
}

export interface SyntheticPushResult {
  acked: boolean;
  nacked: boolean;
}

export type Push = (
  content?: SyntheticMessage,
) => Promise<SyntheticPushResult | void>;

export interface Env extends CoreSource.Env {
  AWS?: {
    SQSClient: typeof SQSClient;
    ReceiveMessageCommand: typeof ReceiveMessageCommand;
    DeleteMessageCommand: typeof DeleteMessageCommand;
    CreateQueueCommand: typeof CreateQueueCommand;
    GetQueueUrlCommand: typeof GetQueueUrlCommand;
    GetQueueAttributesCommand: typeof GetQueueAttributesCommand;
    // SNS used by setup only when subscribeToSnsTopic is set.
    SNSClient?: typeof SNSClient;
    SubscribeCommand?: typeof SubscribeCommand;
  };
}

/**
 * Provisioning options for `walkeros setup source.<id>`.
 *
 * Triggered only by the explicit CLI command. Idempotent. Never auto-run.
 *
 * `queueName` lives in Settings (one source of truth for setup AND runtime poll).
 */
export interface Setup {
  /** AWS region. Default: 'eu-central-1'. */
  region?: string;
  /** FIFO queue with content-based deduplication. Default: false. */
  fifoQueue?: boolean;
  /** Visibility timeout in seconds. Default: 30. */
  visibilityTimeoutSeconds?: number;
  /** Message retention period in seconds. Default: 345600 (4 days). */
  messageRetentionSeconds?: number;
  /** Max message size in bytes. Default: 262144 (256 KB). */
  maximumMessageSize?: number;
  /** KMS key for at-rest encryption. Optional. */
  kmsMasterKeyId?: string;
  /** Optional dead-letter queue. */
  deadLetterQueue?: {
    /** ARN of an existing DLQ. Mutually exclusive with `create: true`. */
    arn?: string;
    /** Create a sibling DLQ named <queueName>-dlq. Default: false. */
    create?: boolean;
    /** Max receive count before message goes to DLQ. Default: 5. */
    maxReceiveCount?: number;
  };
  /** Tags applied to the queue (and inherited by an auto-created DLQ). */
  tags?: Record<string, string>;
  /** Optional: subscribe this queue to an SNS topic. Creates SNS subscription + queue policy. */
  subscribeToSnsTopic?: {
    /** Topic ARN to subscribe to. Required. */
    topicArn: string;
    /** Deliver SNS messages without the SNS envelope. Default: false. */
    rawMessageDelivery?: boolean;
    /** SNS filter policy (subscription-time message filtering). */
    filterPolicy?: Record<string, unknown>;
  };
}

// Source.Types has 6 slots: <Settings, Mapping, Push, Env, InitSettings, Setup>.
// Setup MUST be in slot 6; mis-positioning silently demotes Config['setup'] to unknown.
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

// Re-export SDK types used in this package's public surface.
export type { SQSClient, SQSClientConfig, Message, SNSClient };
