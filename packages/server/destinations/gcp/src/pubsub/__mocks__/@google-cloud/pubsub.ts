// Test-only stateful harness emulating the subset of @google-cloud/pubsub the
// destination uses: PubSub constructor, topic() factory returning a Topic-like
// handle with publishMessage/exists/getMetadata/resumePublishing, and the
// admin entrypoint pubsub.createTopic(name | TopicMetadata).
//
// Exposed harness helpers (typed) let tests program topic state and inspect
// recorded calls without `as any` / `as unknown` casts in test files.

const calls = jest.fn();

interface TopicMetadataLike {
  name?: string | null;
  messageStoragePolicy?: { allowedPersistenceRegions?: string[] | null } | null;
  messageRetentionDuration?: { seconds?: number | string | null } | null;
  kmsKeyName?: string | null;
  labels?: Record<string, string> | null;
}

interface TopicHarness {
  exists: boolean;
  metadata: TopicMetadataLike;
  publishError: unknown;
  createError: unknown;
  getMetadataError: unknown;
}

interface CreateTopicHarness {
  error: unknown;
}

interface MockState {
  topic: TopicHarness;
  createTopic: CreateTopicHarness;
}

const initialTopicState: TopicHarness = {
  exists: true,
  metadata: {},
  publishError: undefined,
  createError: undefined,
  getMetadataError: undefined,
};

const state: MockState = {
  topic: { ...initialTopicState },
  createTopic: { error: undefined },
};

export function __setTopicHarness(patch: Partial<TopicHarness>): void {
  Object.assign(state.topic, patch);
}

export function __setCreateTopicHarness(
  patch: Partial<CreateTopicHarness>,
): void {
  Object.assign(state.createTopic, patch);
}

export function __resetMockCalls(): void {
  state.topic = { ...initialTopicState };
  state.createTopic = { error: undefined };
  calls.mockClear();
}

export interface MockCall {
  method: string;
  args: unknown[];
}

export function __getMockCalls(): MockCall[] {
  const records: MockCall[] = [];
  for (const c of calls.mock.calls) {
    const [method, ...args] = c;
    if (typeof method !== 'string') continue;
    records.push({ method, args });
  }
  return records;
}

interface PublishMessage {
  data?: Buffer;
  attributes?: Record<string, string>;
  orderingKey?: string;
}

class MockTopic {
  name: string;
  options?: { messageOrdering?: boolean };

  constructor(name: string, options?: { messageOrdering?: boolean }) {
    this.name = name;
    this.options = options;
    calls('topic', name, options);
  }

  async publishMessage(message: PublishMessage): Promise<string> {
    const recorded: PublishMessage = {};
    if (message.data) recorded.data = Buffer.from(message.data);
    if (message.attributes) recorded.attributes = message.attributes;
    if (message.orderingKey) recorded.orderingKey = message.orderingKey;
    calls('publishMessage', this.name, recorded);
    if (state.topic.publishError !== undefined) {
      const err = state.topic.publishError;
      state.topic.publishError = undefined;
      throw err;
    }
    return 'mock-message-id';
  }

  resumePublishing(orderingKey: string): void {
    calls('resumePublishing', this.name, orderingKey);
  }

  async exists(): Promise<[boolean]> {
    calls('topic.exists', this.name);
    return [state.topic.exists];
  }

  async create(options?: unknown): Promise<unknown> {
    calls('topic.create', this.name, options);
    if (state.topic.createError !== undefined) {
      const err = state.topic.createError;
      state.topic.createError = undefined;
      throw err;
    }
    return undefined;
  }

  async getMetadata(): Promise<[TopicMetadataLike]> {
    calls('topic.getMetadata', this.name);
    if (state.topic.getMetadataError !== undefined) {
      const err = state.topic.getMetadataError;
      state.topic.getMetadataError = undefined;
      throw err;
    }
    return [state.topic.metadata];
  }
}

export class PubSub {
  options: unknown;

  constructor(options?: unknown) {
    this.options = options;
    calls('PubSub.ctor', options);
  }

  topic(name: string, options?: { messageOrdering?: boolean }): MockTopic {
    return new MockTopic(name, options);
  }

  async createTopic(
    nameOrMetadata: string | TopicMetadataLike,
  ): Promise<[MockTopic, TopicMetadataLike]> {
    calls('createTopic', nameOrMetadata);
    if (state.createTopic.error !== undefined) {
      const err = state.createTopic.error;
      state.createTopic.error = undefined;
      throw err;
    }
    const metadata: TopicMetadataLike =
      typeof nameOrMetadata === 'string'
        ? { name: nameOrMetadata }
        : nameOrMetadata;
    const shortName = (() => {
      const full = typeof metadata.name === 'string' ? metadata.name : '';
      const idx = full.lastIndexOf('/');
      return idx >= 0 ? full.slice(idx + 1) : full;
    })();
    return [new MockTopic(shortName), metadata];
  }

  async close(): Promise<void> {
    calls('PubSub.close');
  }
}
