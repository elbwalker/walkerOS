/**
 * Service account credentials. Mirrors the destination shape in
 * `@walkeros/server-destination-gcp`.
 */
export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

/**
 * Narrow PubSub client interface. Covers only methods this source uses.
 *
 * Mirrors the destination's `PubSubLike` so test mocks can be assigned
 * without casts. The real `@google-cloud/pubsub` PubSub class trivially
 * satisfies this signature.
 */
export interface PubSubLike {
  subscription(name: string, options?: SubscriberOptions): SubscriptionLike;
  topic(name: string): TopicLike;
  createSubscription(
    topic: string | TopicLike,
    name: string,
    options?: SubscriptionCreateOptions,
  ): Promise<unknown>;
  close(): Promise<void>;
}

export interface TopicLike {
  exists(): Promise<[boolean]>;
  create(options?: TopicCreateOptions): Promise<unknown>;
}

export interface SubscriptionLike {
  on(event: 'message', handler: (msg: MessageLike) => void): SubscriptionLike;
  on(event: 'error', handler: (err: Error) => void): SubscriptionLike;
  on(event: 'close', handler: () => void): SubscriptionLike;
  removeAllListeners(): SubscriptionLike;
  exists(): Promise<[boolean]>;
  close(): Promise<void>;
  getMetadata(): Promise<[SubscriptionMetadataLike]>;
}

export interface MessageLike {
  id: string;
  data: Buffer;
  attributes: Record<string, string>;
  orderingKey?: string;
  publishTime: Date;
  ack(): void;
  nack(): void;
  modAck(seconds: number): void;
}

export interface SubscriberOptions {
  flowControl?: {
    maxMessages?: number;
    maxBytes?: number;
    allowExcessMessages?: boolean;
  };
  ackDeadline?: number;
}

export interface TopicCreateOptions {
  messageStoragePolicy?: { allowedPersistenceRegions: string[] };
  messageRetentionDuration?: { seconds: number };
  labels?: Record<string, string>;
}

export interface SubscriptionCreateOptions {
  ackDeadlineSeconds?: number;
  messageRetentionDuration?: { seconds: number };
  filter?: string;
  deadLetterPolicy?: {
    deadLetterTopic: string;
    maxDeliveryAttempts: number;
  };
  retryPolicy?: {
    minimumBackoff: { seconds: number };
    maximumBackoff: { seconds: number };
  };
  enableMessageOrdering?: boolean;
  labels?: Record<string, string>;
  expirationPolicy?: { ttl?: { seconds: number } | null };
}

export interface SubscriptionMetadataLike {
  ackDeadlineSeconds?: number;
  messageRetentionDuration?: { seconds?: number | string };
  filter?: string;
  deadLetterPolicy?: {
    deadLetterTopic?: string;
    maxDeliveryAttempts?: number;
  };
  retryPolicy?: {
    minimumBackoff?: { seconds?: number | string };
    maximumBackoff?: { seconds?: number | string };
  };
  enableMessageOrdering?: boolean;
  labels?: Record<string, string>;
}

export interface PubSubConstructor {
  new (options?: unknown): PubSubLike;
}

/**
 * Decoder mode for the message data payload.
 *
 * - `json`: JSON.parse(data.toString('utf8')). Default.
 * - `text`: data.toString('utf8'). The text becomes the event payload.
 * - `raw`: the raw Buffer is forwarded as-is.
 */
export type Decoder = 'json' | 'text' | 'raw';
