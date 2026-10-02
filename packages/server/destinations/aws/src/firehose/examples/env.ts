import type { PutRecordBatchCommandInput } from '@aws-sdk/client-firehose';
import type { Env, SendClient } from '../types';

/**
 * Example environment for the AWS Firehose destination.
 *
 * `push` is the mock env simulate injects: the client answers every `send`
 * locally, so nothing reaches AWS. Each command keeps its `input`, so a
 * recorded `send` shows the request.
 */

interface RecordsInput {
  Records: unknown[];
}

function hasRecords(value: unknown): value is RecordsInput {
  return (
    typeof value === 'object' &&
    value !== null &&
    'Records' in value &&
    Array.isArray(value.Records)
  );
}

// Mock FirehoseClient class: every record is accepted.
class MockFirehoseClient implements SendClient {
  config: unknown;

  constructor(config?: unknown) {
    this.config = config;
  }

  async send(command: object) {
    const input = 'input' in command ? command.input : undefined;
    const records = hasRecords(input) ? input.Records : [];
    return {
      FailedPutCount: 0,
      Encrypted: false,
      RequestResponses: records.map((_, index) => ({
        RecordId: `mock-record-id-${index}`,
      })),
    };
  }

  destroy(): void {}
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
  AWS: {
    FirehoseClient: MockFirehoseClient,
    PutRecordBatchCommand: MockPutRecordBatchCommand,
  },
};

export const simulation = ['call:AWS.FirehoseClient.send'];
