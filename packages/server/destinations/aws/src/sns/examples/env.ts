import type { Env, SendClient } from '../types';

/**
 * Example environment for the AWS SNS destination.
 *
 * `push` is the mock env simulate injects: the SNS and STS clients answer
 * every `send` locally, so nothing reaches AWS. Each command keeps its
 * `input`, so a recorded `send` shows the request (`CreateTopic` at init,
 * `Publish` per event). Unit tests still substitute the SDK module-wide via
 * `jest.mock('@aws-sdk/client-sns')`.
 */

const TOPIC_ARN = 'arn:aws:sns:eu-central-1:123456789012:walkeros-events';

// The build minifies class names; the tag keeps the SDK command name in
// printed simulate output (`{"PublishCommand":{"input":...}}`).
class MockCommand<Input> {
  constructor(public readonly input: Input) {}
}

class MockCreateTopicCommand extends MockCommand<
  ConstructorParameters<Env['AWS']['CreateTopicCommand']>[0]
> {
  get [Symbol.toStringTag](): string {
    return 'CreateTopicCommand';
  }
}
class MockPublishCommand extends MockCommand<
  ConstructorParameters<Env['AWS']['PublishCommand']>[0]
> {
  get [Symbol.toStringTag](): string {
    return 'PublishCommand';
  }
}
class MockGetTopicAttributesCommand extends MockCommand<
  ConstructorParameters<Env['AWS']['GetTopicAttributesCommand']>[0]
> {
  get [Symbol.toStringTag](): string {
    return 'GetTopicAttributesCommand';
  }
}
class MockSubscribeCommand extends MockCommand<
  ConstructorParameters<Env['AWS']['SubscribeCommand']>[0]
> {
  get [Symbol.toStringTag](): string {
    return 'SubscribeCommand';
  }
}
class MockGetCallerIdentityCommand extends MockCommand<
  ConstructorParameters<Env['AWS']['GetCallerIdentityCommand']>[0]
> {
  get [Symbol.toStringTag](): string {
    return 'GetCallerIdentityCommand';
  }
}

class MockSNSClient implements SendClient {
  constructor(public config?: object) {}
  async send(command: object): Promise<unknown> {
    if (command instanceof MockCreateTopicCommand)
      return { TopicArn: TOPIC_ARN };
    if (command instanceof MockPublishCommand)
      return { MessageId: 'mock-message-id' };
    return {};
  }
}

class MockSTSClient implements SendClient {
  constructor(public config?: object) {}
  async send(): Promise<unknown> {
    return { Account: '123456789012' };
  }
}

export const push: Env = {
  AWS: {
    SNSClient: MockSNSClient,
    CreateTopicCommand: MockCreateTopicCommand,
    PublishCommand: MockPublishCommand,
    GetTopicAttributesCommand: MockGetTopicAttributesCommand,
    SubscribeCommand: MockSubscribeCommand,
    STSClient: MockSTSClient,
    GetCallerIdentityCommand: MockGetCallerIdentityCommand,
  },
};

/** Every request goes through `send`; the command in `args[0]` names it. */
export const simulation = ['call:AWS.SNSClient.send'];
