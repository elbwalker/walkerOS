import type {
  Env,
  PubSubPublisher,
  PublishMessage,
  TopicPublisher,
} from '../types';

/**
 * Example environment for the GCP Pub/Sub destination.
 *
 * `push` is the mock env simulate injects: `PubSub` builds a client whose
 * topics answer `publishMessage` locally, so nothing reaches GCP. Unit tests
 * still substitute the SDK module-wide via `jest.mock('@google-cloud/pubsub')`.
 */

class MockTopic implements TopicPublisher {
  constructor(public name: string) {}
  publishMessage(_message: PublishMessage): Promise<string> {
    return Promise.resolve('mock-message-id');
  }
  resumePublishing(_orderingKey: string): void {}
}

class MockPubSub implements PubSubPublisher {
  constructor(public options?: object) {}
  topic(name: string): TopicPublisher {
    return new MockTopic(name);
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}

export const push: Env = {
  PubSub: MockPubSub,
};

/** The publish carries the request; `args[0]` is the message. */
export const simulation = ['call:PubSub.topic.publishMessage'];
