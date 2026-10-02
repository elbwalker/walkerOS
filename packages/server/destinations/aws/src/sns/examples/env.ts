import type {
  CreateTopicCommandInput,
  GetTopicAttributesCommandInput,
  PublishCommandInput,
  SubscribeCommandInput,
} from '@aws-sdk/client-sns';
import type { GetCallerIdentityCommandInput } from '@aws-sdk/client-sts';
import type { Env, SendClient } from '../types';

/**
 * Example environment for the AWS SNS destination.
 *
 * `push` is the mock env simulate injects: the SNS and STS clients answer
 * every `send` locally, so nothing reaches AWS. Each command keeps its
 * `input`, so a recorded `send` shows the request (`Publish` per event).
 * Unit tests still substitute the SDK module-wide via
 * `jest.mock('@aws-sdk/client-sns')`.
 */

const TOPIC_ARN = 'arn:aws:sns:eu-central-1:123456789012:walkeros-events';

// The build minifies class names; the tag keeps the SDK command name in
// printed simulate output (`{"PublishCommand":{"input":...}}`).
class MockCommand<Input> {
  constructor(public readonly input: Input) {}
}

class MockCreateTopicCommand extends MockCommand<CreateTopicCommandInput> {
  get [Symbol.toStringTag](): string {
    return 'CreateTopicCommand';
  }
}
class MockPublishCommand extends MockCommand<PublishCommandInput> {
  get [Symbol.toStringTag](): string {
    return 'PublishCommand';
  }
}
class MockGetTopicAttributesCommand extends MockCommand<GetTopicAttributesCommandInput> {
  get [Symbol.toStringTag](): string {
    return 'GetTopicAttributesCommand';
  }
}
class MockSubscribeCommand extends MockCommand<SubscribeCommandInput> {
  get [Symbol.toStringTag](): string {
    return 'SubscribeCommand';
  }
}
class MockGetCallerIdentityCommand extends MockCommand<GetCallerIdentityCommandInput> {
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
  destroy(): void {}
}

class MockSTSClient implements SendClient {
  constructor(public config?: object) {}
  async send(): Promise<unknown> {
    return {
      Account: '123456789012',
      Arn: 'arn:aws:iam::123456789012:user/walkeros',
    };
  }
  destroy(): void {}
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
