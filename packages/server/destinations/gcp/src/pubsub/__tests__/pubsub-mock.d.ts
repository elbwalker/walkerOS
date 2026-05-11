// Ambient declarations layered on top of `@google-cloud/pubsub` so test files
// can `import { __setTopicHarness, ... } from '@google-cloud/pubsub'` without
// `as any` / `as unknown` casts. The runtime exports come from the package-
// local manual mock at `__mocks__/@google-cloud/pubsub.ts`, activated via
// `jest.mock('@google-cloud/pubsub')`.

declare module '@google-cloud/pubsub' {
  interface PubSubMockTopicMetadata {
    name?: string | null;
    messageStoragePolicy?: {
      allowedPersistenceRegions?: string[] | null;
    } | null;
    messageRetentionDuration?: { seconds?: number | string | null } | null;
    kmsKeyName?: string | null;
    labels?: Record<string, string> | null;
  }

  interface PubSubMockTopicHarness {
    exists?: boolean;
    metadata?: PubSubMockTopicMetadata;
    publishError?: unknown;
    createError?: unknown;
    getMetadataError?: unknown;
  }

  interface PubSubMockCreateTopicHarness {
    error?: unknown;
  }

  interface PubSubMockCall {
    method: string;
    args: unknown[];
  }

  export function __setTopicHarness(patch: PubSubMockTopicHarness): void;
  export function __setCreateTopicHarness(
    patch: PubSubMockCreateTopicHarness,
  ): void;
  export function __resetMockCalls(): void;
  export function __getMockCalls(): PubSubMockCall[];
}

export {};
