import type { PutRecordBatchCommandInput } from '@aws-sdk/client-firehose';
import type { Env, SendClient } from '../types';

/**
 * Example environment configurations for AWS Firehose destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring actual AWS SDK dependencies.
 */

// Mock FirehoseClient class
class MockFirehoseClient implements SendClient {
  config: unknown;

  constructor(config?: unknown) {
    this.config = config;
  }

  async send(_command: object) {
    // Simulate successful response
    return {
      RecordId: 'mock-record-id',
      ResponseMetadata: {
        RequestId: 'mock-request-id',
      },
    };
  }
}

// Mock PutRecordBatchCommand class. The build minifies class names; the tag
// keeps the SDK command name in printed simulate output.
class MockPutRecordBatchCommand {
  readonly input: PutRecordBatchCommandInput;

  constructor(input: PutRecordBatchCommandInput) {
    this.input = input;
  }

  get [Symbol.toStringTag](): string {
    return 'PutRecordBatchCommand';
  }
}

export const push: Env = {
  // Environment for push operations
  AWS: {
    FirehoseClient: MockFirehoseClient,
    PutRecordBatchCommand: MockPutRecordBatchCommand,
  },
};

export const simulation = ['call:AWS.FirehoseClient.send'];
