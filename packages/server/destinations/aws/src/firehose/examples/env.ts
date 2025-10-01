import type { Environment } from '../types';

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

export const env: {
  push: Environment;
} = {
  // Standard environment for push operations
  push: {
    AWS: {
      FirehoseClient:
        MockFirehoseClient as unknown as Environment['AWS']['FirehoseClient'],
      PutRecordBatchCommand:
        MockPutRecordBatchCommand as unknown as Environment['AWS']['PutRecordBatchCommand'],
    },
  },
};
