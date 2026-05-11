// Test-only stateful harness emulating the subset of @google-cloud/pubsub the
// pull/push sources use: PubSub constructor, subscription() factory returning
// a Subscription-like EventEmitter (`message`, `error`, `close`), topic()
// factory, the admin entrypoints createSubscription / createTopic, and
// getMetadata for both topics and subscriptions.
//
// Exposed harness helpers (typed) let tests program the mock state and inspect
// recorded calls without `as any` / `as unknown` casts in test files.

const calls = jest.fn();

interface SubscriptionMetadataLike {
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

interface TopicMetadataLike {
  name?: string | null;
  messageStoragePolicy?: { allowedPersistenceRegions?: string[] | null } | null;
  messageRetentionDuration?: { seconds?: number | string | null } | null;
  kmsKeyName?: string | null;
  labels?: Record<string, string> | null;
}

interface SubscriptionHarness {
  metadata: SubscriptionMetadataLike;
  closeHangs: boolean;
  exists: boolean;
  getMetadataError: unknown;
}

interface TopicHarness {
  exists: boolean;
  metadata: TopicMetadataLike;
  createError: unknown;
}

interface CreateSubscriptionHarness {
  error: unknown;
}

interface CreateTopicHarness {
  error: unknown;
}

interface DeliveredMessage {
  id: string;
  ackId: string;
  data: Buffer;
  attributes: Record<string, string>;
  orderingKey?: string;
  deliveryAttempt: number;
  publishTime: Date;
  received: number;
  ack(): void;
  nack(): void;
  modAck(): void;
}

interface RegisteredHandlers {
  message?: (msg: DeliveredMessage) => void;
  error?: (err: Error) => void;
  close?: () => void;
}

type MessageHandler = (msg: DeliveredMessage) => void;
type ErrorHandler = (err: Error) => void;
type CloseHandler = () => void;

interface MockState {
  subscription: SubscriptionHarness;
  topics: Map<string, TopicHarness>;
  createSubscription: CreateSubscriptionHarness;
  createTopic: CreateTopicHarness;
  handlers: RegisteredHandlers;
  closed: boolean;
}

const initialSubscriptionState: SubscriptionHarness = {
  metadata: {},
  closeHangs: false,
  exists: true,
  getMetadataError: undefined,
};

function makeInitialTopicState(): TopicHarness {
  return { exists: false, metadata: {}, createError: undefined };
}

const state: MockState = {
  subscription: { ...initialSubscriptionState },
  topics: new Map(),
  createSubscription: { error: undefined },
  createTopic: { error: undefined },
  handlers: {},
  closed: false,
};

function getOrCreateTopicState(name: string): TopicHarness {
  let topicState = state.topics.get(name);
  if (!topicState) {
    topicState = makeInitialTopicState();
    state.topics.set(name, topicState);
  }
  return topicState;
}

export function __resetMockCalls(): void {
  state.subscription = { ...initialSubscriptionState };
  state.topics = new Map();
  state.createSubscription = { error: undefined };
  state.createTopic = { error: undefined };
  state.handlers = {};
  state.closed = false;
  calls.mockClear();
}

export function __setSubscriptionHarness(
  patch: Partial<SubscriptionHarness>,
): void {
  Object.assign(state.subscription, patch);
}

export function __setTopicHarness(
  name: string,
  patch: Partial<TopicHarness>,
): void {
  const topicState = getOrCreateTopicState(name);
  Object.assign(topicState, patch);
}

export function __setCreateSubscriptionHarness(
  patch: Partial<CreateSubscriptionHarness>,
): void {
  Object.assign(state.createSubscription, patch);
}

export function __setCreateTopicHarness(
  patch: Partial<CreateTopicHarness>,
): void {
  Object.assign(state.createTopic, patch);
}

export function __triggerError(err: Error): void {
  if (!state.handlers.error) return;
  state.handlers.error(err);
}

export function __isSubscriptionClosed(): boolean {
  return state.closed;
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

class MockTopic {
  name: string;

  constructor(name: string) {
    this.name = name;
    calls('topic', name);
  }

  async exists(): Promise<[boolean]> {
    calls('topic.exists', this.name);
    const topicState = getOrCreateTopicState(this.name);
    return [topicState.exists];
  }

  async create(options?: unknown): Promise<unknown> {
    calls('topic.create', this.name, options);
    const topicState = getOrCreateTopicState(this.name);
    if (topicState.createError !== undefined) {
      const err = topicState.createError;
      topicState.createError = undefined;
      throw err;
    }
    topicState.exists = true;
    return undefined;
  }
}

class MockSubscription {
  name: string;
  options: unknown;

  constructor(name: string, options?: unknown) {
    this.name = name;
    this.options = options;
    calls('subscription', name, options);
  }

  on(event: 'message', handler: MessageHandler): this;
  on(event: 'error', handler: ErrorHandler): this;
  on(event: 'close', handler: CloseHandler): this;
  on(
    event: 'message' | 'error' | 'close',
    handler: MessageHandler | ErrorHandler | CloseHandler,
  ): this {
    // Split-by-event dispatch. Each branch gets a function that, structurally,
    // is `(unknown-arg) => void`; storing it under the typed slot is sound
    // because the mock is the sole caller of these handlers and dispatches
    // them with the matching argument shape (DeliveredMessage / Error / void).
    if (event === 'message') {
      const messageHandler: MessageHandler = handler as MessageHandler;
      state.handlers.message = messageHandler;
    } else if (event === 'error') {
      const errorHandler: ErrorHandler = handler as ErrorHandler;
      state.handlers.error = errorHandler;
    } else {
      const closeHandler: CloseHandler = handler as CloseHandler;
      state.handlers.close = closeHandler;
    }
    calls('subscription.on', event);
    return this;
  }

  removeAllListeners(): MockSubscription {
    state.handlers.message = undefined;
    state.handlers.error = undefined;
    state.handlers.close = undefined;
    return this;
  }

  async exists(): Promise<[boolean]> {
    calls('subscription.exists', this.name);
    return [state.subscription.exists];
  }

  async close(): Promise<void> {
    calls('subscription.close', this.name);
    if (state.subscription.closeHangs) {
      // Resolve never to simulate a stuck close.
      await new Promise<void>(() => {
        /* never resolves */
      });
    }
    state.closed = true;
  }

  async getMetadata(): Promise<[SubscriptionMetadataLike]> {
    calls('subscription.getMetadata', this.name);
    if (state.subscription.getMetadataError !== undefined) {
      const err = state.subscription.getMetadataError;
      state.subscription.getMetadataError = undefined;
      throw err;
    }
    return [state.subscription.metadata];
  }
}

/**
 * Minimal Duration stand-in. The real SDK's Duration is a class with a
 * `seconds` accessor; tests only need a value the source can pass through
 * to the typed SubscriberOptions slot. Recording the seconds count is enough
 * for assertion purposes.
 */
class MockDuration {
  readonly seconds: number;
  private constructor(seconds: number) {
    this.seconds = seconds;
  }
  static from(input: { seconds?: number }): MockDuration {
    return new MockDuration(input.seconds ?? 0);
  }
}

export const Duration = MockDuration;

export class PubSub {
  options: unknown;

  constructor(options?: unknown) {
    this.options = options;
    calls('PubSub.ctor', options);
  }

  subscription(name: string, options?: unknown): MockSubscription {
    return new MockSubscription(name, options);
  }

  topic(name: string): MockTopic {
    return new MockTopic(name);
  }

  async createSubscription(
    topic: string | { name?: string },
    name: string,
    options?: unknown,
  ): Promise<unknown> {
    const topicName =
      typeof topic === 'string'
        ? topic
        : typeof topic?.name === 'string'
          ? topic.name
          : '<topic-handle>';
    calls('createSubscription', topicName, name, options);
    if (state.createSubscription.error !== undefined) {
      const err = state.createSubscription.error;
      state.createSubscription.error = undefined;
      throw err;
    }
    return undefined;
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
    const topicState = getOrCreateTopicState(shortName);
    topicState.exists = true;
    if (typeof metadata === 'object') {
      topicState.metadata = { ...topicState.metadata, ...metadata };
    }
    return [new MockTopic(shortName), metadata];
  }

  async close(): Promise<void> {
    calls('PubSub.close');
  }
}
