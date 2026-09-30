import type {
  CreateQueueCommandOutput,
  DeleteMessageCommandOutput,
  GetQueueAttributesCommandOutput,
  GetQueueUrlCommandOutput,
  ReceiveMessageCommandOutput,
  SQSClientConfig,
} from '@aws-sdk/client-sqs';
import type { Env, SqsClient } from '../types';
import type { Elb, Logger } from '@walkeros/core';

/**
 * Example environment for the AWS SQS source.
 *
 * `push` injects a structural SQS client (`env.AWS.SQSClient`), so a
 * simulated run never reaches AWS and its `send` calls can be recorded. The
 * unit tests keep substituting the SDK module-wide via
 * `jest.mock('@aws-sdk/client-sqs')`; they use `push` without the client.
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

const QUEUE_URL =
  'https://sqs.eu-central-1.amazonaws.com/000000000000/walkeros-events';
const QUEUE_ARN = 'arn:aws:sqs:eu-central-1:000000000000:walkeros-events';

/** A long poll that finds nothing, kept short so a simulated run ends fast. */
const RECEIVE_WAIT_MS = 100;

/** One response that satisfies every command the source sends. */
type SqsResponse = GetQueueUrlCommandOutput &
  GetQueueAttributesCommandOutput &
  ReceiveMessageCommandOutput &
  DeleteMessageCommandOutput &
  CreateQueueCommandOutput;

function isReceive(command: object): boolean {
  if (!('input' in command)) return false;
  const { input } = command;
  return (
    typeof input === 'object' && input !== null && 'WaitTimeSeconds' in input
  );
}

/**
 * Answers every command with the queue URL and ARN and an empty receive, so
 * init resolves the queue and the long-poll loop idles without messages.
 */
class MockSQSClient implements SqsClient {
  constructor(public config?: SQSClientConfig) {}

  async send(command: object): Promise<SqsResponse> {
    if (isReceive(command)) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, RECEIVE_WAIT_MS),
      );
    }
    return {
      $metadata: {},
      QueueUrl: QUEUE_URL,
      Attributes: { QueueArn: QUEUE_ARN },
      Messages: [],
    };
  }

  destroy(): void {}
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
export const push: Env = Object.assign(createEnv(), {
  AWS: { SQSClient: MockSQSClient },
});

/**
 * The same environment without the client, for unit tests that substitute the
 * SDK module-wide with `jest.mock`.
 */
export const moduleMockEnv: Env = createEnv();

/** Every request (queue lookup, receive, delete) goes through `send`. */
export const simulation = ['call:AWS.SQSClient.send'];
