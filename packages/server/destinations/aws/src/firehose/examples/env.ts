import type { Env } from '../types';

/**
 * Example environment configurations for AWS Firehose destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring actual AWS SDK dependencies.
 */

// Mock FirehoseClient class
class MockFirehoseClient {
  config: unknown;

  constructor(config?: unknown) {
    this.config = config;
  }

  async send(command: unknown) {
    // Simulate successful response
    return {
      RecordId: 'mock-record-id',
      ResponseMetadata: {
        RequestId: 'mock-request-id',
      },
    };
  }
}

// Mock PutRecordBatchCommand class
class MockPutRecordBatchCommand {
  input: unknown;

  constructor(input: unknown) {
    this.input = input;
  }
}

export const push: Env = {
  // Environment for push operations
  AWS: {
    FirehoseClient:
      MockFirehoseClient as unknown as Env['AWS']['FirehoseClient'],
    PutRecordBatchCommand:
      MockPutRecordBatchCommand as unknown as Env['AWS']['PutRecordBatchCommand'],
  },
};

export const simulation = ['AWS.FirehoseClient'];
