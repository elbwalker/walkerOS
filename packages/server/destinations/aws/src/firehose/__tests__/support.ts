// Shared bootstrap and recording env for the Firehose suites. Not a suite:
// jest picks up `*.test.ts` only.

import type {
  FirehoseClientConfig,
  PutRecordBatchCommandInput,
} from '@aws-sdk/client-firehose';
import type { Destination, MockLogger, WalkerOS } from '@walkeros/core';
import {
  createEvent,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import destination from '../';
import type { Config, Env, Mapping, PartialConfig, SendClient } from '../types';

export const id = 'firehose';
export const STREAM = 'walkeros-events';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** An answer accepting every record of the call. */
export function accepted(input: PutRecordBatchCommandInput): unknown {
  return {
    FailedPutCount: 0,
    Encrypted: false,
    RequestResponses: (input.Records ?? []).map((_, i) => ({
      RecordId: `r-${i}`,
    })),
    $metadata: { httpStatusCode: 200, attempts: 1 },
  };
}

export type Answer = (
  input: PutRecordBatchCommandInput,
  call: number,
) => Promise<unknown>;

export interface Recording {
  env: Env;
  /** Options each client was constructed with. */
  constructed: FirehoseClientConfig[];
  /** Input of every send, in call order. */
  sends: PutRecordBatchCommandInput[];
  /** `destroy` of every constructed client. */
  destroyed: jest.Mock[];
}

function isCommand(
  value: object,
): value is { input: PutRecordBatchCommandInput } {
  return 'input' in value && isRecord(value.input);
}

/** A mock env recording construction and every send. */
export function recordingEnv(
  answer: Answer = async (input) => accepted(input),
): Recording {
  const constructed: FirehoseClientConfig[] = [];
  const sends: PutRecordBatchCommandInput[] = [];
  const destroyed: jest.Mock[] = [];

  class RecordingClient implements SendClient {
    readonly destroy = jest.fn();
    constructor(config: FirehoseClientConfig) {
      constructed.push(config);
      destroyed.push(this.destroy);
    }
    async send(command: object): Promise<unknown> {
      if (!isCommand(command)) throw new Error('not a command');
      sends.push(command.input);
      return answer(command.input, sends.length - 1);
    }
  }

  class RecordingCommand {
    constructor(readonly input: PutRecordBatchCommandInput) {}
  }

  return {
    env: {
      AWS: {
        FirehoseClient: RecordingClient,
        PutRecordBatchCommand: RecordingCommand,
      },
    },
    constructed,
    sends,
    destroyed,
  };
}

/** Runs the real init and returns the resolved config. */
export async function initialized(
  config: PartialConfig,
  env: Env | undefined,
  logger: MockLogger = createMockLogger(),
): Promise<Config> {
  const resolved = await destination.init(
    createMockContext({ config, env, id, logger }),
  );
  if (!resolved || !resolved.settings)
    throw new Error('init must return the resolved config');
  return { ...resolved, settings: resolved.settings };
}

/** The records of one send, decoded back to their JSON text. */
export function recordTexts(input: PutRecordBatchCommandInput): string[] {
  return (input.Records ?? []).map(({ Data }) =>
    Buffer.from(Data ?? new Uint8Array()).toString('utf8'),
  );
}

export function events(count: number): WalkerOS.Event[] {
  return Array.from({ length: count }, (_, i) =>
    createEvent({ id: `ev-${i}` }),
  );
}

/** A batch the collector would flush, with no mapping data. */
export function batchOf(list: WalkerOS.Event[]): Destination.Batch<Mapping> {
  return {
    key: 'default',
    entries: list.map((event) => ({ event })),
    events: list,
    data: [],
  };
}
