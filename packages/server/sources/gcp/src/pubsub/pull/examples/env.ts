import type { Message, SubscriptionOptions } from '@google-cloud/pubsub';
import type { Env, PubSubPullClient, PullSubscription } from '../types';
import type { Elb, Logger } from '@walkeros/core';

/**
 * Example environment for the Pub/Sub pull source.
 *
 * `push` injects a structural Pub/Sub client (`env.PubSub`), so a simulated
 * run never reaches Google Cloud and its subscription call can be recorded.
 * The unit tests keep substituting the SDK module-wide via
 * `jest.mock('@google-cloud/pubsub')`; they use `push` without the client.
 */

const noopFn = (): void => undefined;
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
  const fn: Elb.Fn = () => Promise.resolve({ ok: true });
  return fn;
};

/** A subscription that never receives: messages arrive by synthetic push. */
class MockSubscription implements PullSubscription {
  constructor(
    public name: string,
    public options?: SubscriptionOptions,
  ) {}

  on(
    _event: 'message' | 'error',
    _listener: ((message: Message) => void) | ((error: Error) => void),
  ): this {
    return this;
  }

  async close(): Promise<void> {}
}

class MockPubSub implements PubSubPullClient {
  constructor(public options?: object) {}

  subscription(name: string, options?: SubscriptionOptions): MockSubscription {
    return new MockSubscription(name, options);
  }

  async close(): Promise<void> {}
}

function createEnv(): Env {
  return {
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
}

/** Standard mock environment, with the structural client for simulate. */
export const push: Env = Object.assign(createEnv(), { PubSub: MockPubSub });

/**
 * The same environment without the client, for unit tests that substitute the
 * SDK module-wide with `jest.mock`.
 */
export const moduleMockEnv: Env = createEnv();

/**
 * The subscription call binds the source to its subscription; messages then
 * arrive as events, not calls. Construction is not recorded: its options
 * carry credentials.
 */
export const simulation = ['call:PubSub.subscription'];
