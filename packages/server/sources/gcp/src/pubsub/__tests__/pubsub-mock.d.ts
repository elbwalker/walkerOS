// Ambient declarations layered on top of `@google-cloud/pubsub` so test files
// can `import { __setSubscriptionHarness, ... } from '@google-cloud/pubsub'`
// without `as any` / `as unknown` casts. The runtime exports come from the
// package-local manual mock at `__mocks__/@google-cloud/pubsub.ts`, activated
// via `jest.mock('@google-cloud/pubsub')`.

declare module '@google-cloud/pubsub' {
  interface PubSubMockSubscriptionMetadata {
    ackDeadlineSeconds?: number | null;
    messageRetentionDuration?:
      | { seconds?: number | string | null }
      | number
      | null;
    filter?: string | null;
    enableMessageOrdering?: boolean | null;
    deadLetterPolicy?: {
      deadLetterTopic?: string | null;
      maxDeliveryAttempts?: number | null;
    } | null;
  }

  interface PubSubMockTopicMetadata {
    name?: string | null;
    messageStoragePolicy?: {
      allowedPersistenceRegions?: string[] | null;
    } | null;
    messageRetentionDuration?: { seconds?: number | string | null } | null;
    kmsKeyName?: string | null;
    labels?: Record<string, string> | null;
  }

  interface PubSubMockSubscriptionHarness {
    metadata?: PubSubMockSubscriptionMetadata;
    closeHangs?: boolean;
    exists?: boolean;
    getMetadataError?: unknown;
  }

  interface PubSubMockTopicHarness {
    exists?: boolean;
    metadata?: PubSubMockTopicMetadata;
    createError?: unknown;
  }

  interface PubSubMockCreateSubscriptionHarness {
    error?: unknown;
  }

  interface PubSubMockCreateTopicHarness {
    error?: unknown;
  }

  interface PubSubMockCall {
    method: string;
    args: unknown[];
  }

  export function __setSubscriptionHarness(
    patch: PubSubMockSubscriptionHarness,
  ): void;
  export function __setTopicHarness(
    name: string,
    patch: PubSubMockTopicHarness,
  ): void;
  export function __setCreateSubscriptionHarness(
    patch: PubSubMockCreateSubscriptionHarness,
  ): void;
  export function __setCreateTopicHarness(
    patch: PubSubMockCreateTopicHarness,
  ): void;
  export function __resetMockCalls(): void;
  export function __getMockCalls(): PubSubMockCall[];
  export function __triggerError(err: Error): void;
  export function __isSubscriptionClosed(): boolean;
}

export {};
