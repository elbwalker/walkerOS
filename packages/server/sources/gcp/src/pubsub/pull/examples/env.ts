import type { Env, PubSubLike, SubscriptionLike } from '../types';
import type {
  MessageLike,
  PubSubConstructor,
  SubscriberOptions,
  SubscriptionMetadataLike,
  TopicCreateOptions,
  TopicLike,
} from '../../shared/types';
import type { Elb, Logger } from '@walkeros/core';

/**
 * Example environment for the Pub/Sub pull source.
 *
 * Provides a typed MockPubSub implementing PubSubLike that records calls
 * and stashes the message handler so the trigger can synthesize message
 * arrivals without contacting real GCP infrastructure.
 *
 * Mock types live HERE (test-adjacent) and are NOT exposed in `../types`.
 */

interface MockCall {
  method: string;
  args: unknown[];
}

const calls: MockCall[] = [];

export function __getMockCalls(): MockCall[] {
  return calls.slice();
}

export function __resetMockState(): void {
  calls.length = 0;
  registeredHandlers.message = undefined;
  registeredHandlers.error = undefined;
  closed = false;
  nextSubscriptionExists = true;
  nextCreateError = undefined;
  nextSubscriptionMetadata = undefined;
  nextCloseHangs = false;
  pendingTopicExists.clear();
  pendingTopicCreateErrors.clear();
}

interface RegisteredHandlers {
  message?: (msg: MessageLike) => void;
  error?: (err: Error) => void;
}

const registeredHandlers: RegisteredHandlers = {};
let closed = false;
let nextSubscriptionExists = true;
let nextCreateError: unknown;
let nextSubscriptionMetadata: SubscriptionMetadataLike | undefined;
const pendingTopicExists = new Map<string, boolean>();
const pendingTopicCreateErrors = new Map<string, unknown>();

/**
 * Toggle the close-hang behavior on the next subscription returned by the
 * mock client. Used by the destroy-timeout test to simulate a stuck close
 * without reaching into the source's runtime state.
 */
let nextCloseHangs = false;

export function __setNextCloseHangs(hang: boolean): void {
  nextCloseHangs = hang;
}

export function __setNextSubscriptionExists(exists: boolean): void {
  nextSubscriptionExists = exists;
}

export function __setNextCreateError(err: unknown): void {
  nextCreateError = err;
}

export function __setNextSubscriptionMetadata(
  meta: SubscriptionMetadataLike,
): void {
  nextSubscriptionMetadata = meta;
}

export function __setTopicExists(name: string, exists: boolean): void {
  pendingTopicExists.set(name, exists);
}

export function __setTopicCreateError(name: string, err: unknown): void {
  pendingTopicCreateErrors.set(name, err);
}

export function __triggerMessage(msg: MessageLike): Promise<void> | void {
  if (!registeredHandlers.message) return;
  return registeredHandlers.message(msg);
}

export function __triggerError(err: Error): void {
  if (!registeredHandlers.error) return;
  registeredHandlers.error(err);
}

export function __isClosed(): boolean {
  return closed;
}

class MockTopic implements TopicLike {
  constructor(private name: string) {
    calls.push({ method: 'topic', args: [name] });
  }

  async exists(): Promise<[boolean]> {
    calls.push({ method: 'topic.exists', args: [this.name] });
    const exists = pendingTopicExists.get(this.name) ?? false;
    return [exists];
  }

  async create(options?: TopicCreateOptions): Promise<unknown> {
    calls.push({ method: 'topic.create', args: [this.name, options] });
    const err = pendingTopicCreateErrors.get(this.name);
    if (err !== undefined) {
      pendingTopicCreateErrors.delete(this.name);
      throw err;
    }
    return undefined;
  }
}

class MockSubscription implements SubscriptionLike {
  private closeHangsForTest: boolean;

  constructor(
    private name: string,
    options?: SubscriberOptions,
  ) {
    this.closeHangsForTest = nextCloseHangs;
    calls.push({ method: 'subscription', args: [name, options] });
  }

  on(event: 'message', handler: (msg: MessageLike) => void): SubscriptionLike;
  on(event: 'error', handler: (err: Error) => void): SubscriptionLike;
  on(event: 'close', handler: () => void): SubscriptionLike;
  on(
    event: 'message' | 'error' | 'close',
    handler:
      | ((msg: MessageLike) => void)
      | ((err: Error) => void)
      | (() => void),
  ): SubscriptionLike {
    if (event === 'message') {
      registeredHandlers.message = handler as (msg: MessageLike) => void;
    } else if (event === 'error') {
      registeredHandlers.error = handler as (err: Error) => void;
    }
    calls.push({ method: 'subscription.on', args: [event] });
    return this;
  }

  removeAllListeners(): SubscriptionLike {
    registeredHandlers.message = undefined;
    registeredHandlers.error = undefined;
    return this;
  }

  async exists(): Promise<[boolean]> {
    calls.push({ method: 'subscription.exists', args: [this.name] });
    return [nextSubscriptionExists];
  }

  async close(): Promise<void> {
    calls.push({ method: 'subscription.close', args: [this.name] });
    if (this.closeHangsForTest) {
      // Resolve never to simulate a stuck close.
      await new Promise<void>(() => {
        /* never resolves */
      });
    }
    closed = true;
  }

  async getMetadata(): Promise<[SubscriptionMetadataLike]> {
    calls.push({ method: 'subscription.getMetadata', args: [this.name] });
    return [nextSubscriptionMetadata ?? {}];
  }
}

class MockPubSub implements PubSubLike {
  options: unknown;

  constructor(options?: unknown) {
    this.options = options;
    calls.push({ method: 'PubSub.ctor', args: [options] });
  }

  subscription(name: string, options?: SubscriberOptions): SubscriptionLike {
    return new MockSubscription(name, options);
  }

  topic(name: string): TopicLike {
    return new MockTopic(name);
  }

  async createSubscription(
    topic: string | TopicLike,
    name: string,
    options?: unknown,
  ): Promise<unknown> {
    const topicName = typeof topic === 'string' ? topic : '<topic-handle>';
    calls.push({
      method: 'PubSub.createSubscription',
      args: [topicName, name, options],
    });
    if (nextCreateError !== undefined) {
      const err = nextCreateError;
      nextCreateError = undefined;
      throw err;
    }
    return undefined;
  }

  async close(): Promise<void> {
    calls.push({ method: 'PubSub.close', args: [] });
  }
}

export const MockPubSubConstructor: PubSubConstructor = MockPubSub;

const noopFn = () => {};
const noopLogger: Logger.Instance = {
  error: noopFn,
  warn: noopFn,
  info: noopFn,
  debug: noopFn,
  throw: (message: string | Error) => {
    throw typeof message === 'string' ? new Error(message) : message;
  },
  json: noopFn,
  scope: () => noopLogger,
};

const createMockElbFn = (): Elb.Fn => {
  const fn = (() => Promise.resolve({ ok: true })) as Elb.Fn;
  return fn;
};

/**
 * Standard mock environment for the pull source.
 */
export const push: Env = {
  PubSub: MockPubSubConstructor,
  get push() {
    return createMockElbFn();
  },
  get command() {
    return createMockElbFn();
  },
  get elb() {
    return createMockElbFn();
  },
  logger: noopLogger,
};

export const simulation = ['PubSub'];
