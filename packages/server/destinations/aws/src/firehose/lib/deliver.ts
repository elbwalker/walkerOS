import type { Destination, Logger, WalkerOS } from '@walkeros/core';
import { PutRecordBatchCommand } from '@aws-sdk/client-firehose';
import type { Env, Settings } from '../types';
import type { DeliveryTarget } from '../../lib/errors';
import {
  AwsDeliveryError,
  fromSdkError,
  localError,
  recordError,
} from '../../lib/errors';
import type { PlannedRecord } from './records';
import { planChunks, toPayload } from './records';

/** One event to deliver, with what a mapping produced for it. */
export interface DeliveryItem {
  event: WalkerOS.Event;
  data?: unknown;
}

/** A record that did not land, by its index in the delivery. */
export interface DeliveryFailure {
  index: number;
  error: AwsDeliveryError;
}

/** The per-record answer of a `PutRecordBatch` call, as far as it is read. */
interface RecordResponse {
  errorCode?: string;
  errorMessage?: string;
}

/** A `PutRecordBatch` answer, read field by field from an unknown value. */
interface CallResponse {
  failedPutCount?: number;
  responses?: RecordResponse[];
  status?: number;
  attempts?: number;
}

/** Any non-null object, SDK errors included (`isObject` accepts plain ones only). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readMetadata(value: unknown): { status?: number; attempts?: number } {
  if (!isRecord(value)) return {};
  const metadata = value.$metadata;
  if (!isRecord(metadata)) return {};
  const { httpStatusCode, attempts } = metadata;
  return {
    status: typeof httpStatusCode === 'number' ? httpStatusCode : undefined,
    attempts: typeof attempts === 'number' ? attempts : undefined,
  };
}

function readResponse(value: unknown): CallResponse {
  const response: CallResponse = readMetadata(value);
  if (!isRecord(value)) return response;

  if (typeof value.FailedPutCount === 'number')
    response.failedPutCount = value.FailedPutCount;

  if (Array.isArray(value.RequestResponses)) {
    response.responses = value.RequestResponses.map(
      (entry: unknown): RecordResponse => {
        if (!isRecord(entry)) return {};
        const { ErrorCode, ErrorMessage } = entry;
        return {
          errorCode:
            typeof ErrorCode === 'string' && ErrorCode.length > 0
              ? ErrorCode
              : undefined,
          errorMessage:
            typeof ErrorMessage === 'string' ? ErrorMessage : undefined,
        };
      },
    );
  }

  return response;
}

/**
 * Maps one call's answer onto its records. Per-record answers are trusted only
 * when they line up with the records sent and agree with `FailedPutCount`; a
 * reported failure they cannot place fails the whole chunk as
 * `InvalidResponse`, never as delivered.
 */
function chunkFailures(
  chunk: readonly PlannedRecord[],
  response: CallResponse,
  target: DeliveryTarget,
): DeliveryFailure[] {
  const { responses, failedPutCount, status } = response;

  if (responses && responses.length === chunk.length) {
    const failures: DeliveryFailure[] = [];
    responses.forEach((entry, local) => {
      if (!entry.errorCode) return;
      failures.push({
        index: chunk[local].index,
        error: recordError(
          target,
          entry.errorCode,
          entry.errorMessage ?? 'Record rejected.',
          status,
        ),
      });
    });
    // Entries that do not account for the reported count cannot place the
    // failures, so none of them is trusted.
    if (failedPutCount === undefined || failures.length === failedPutCount)
      return failures;
  } else if (failedPutCount === 0) return [];

  const error = localError(
    target,
    'InvalidResponse',
    `PutRecordBatch answered without per-record results that match its FailedPutCount for ${chunk.length} records (FailedPutCount ${failedPutCount ?? 'missing'}).`,
  );
  return chunk.map(({ index }) => ({ index, error }));
}

/**
 * Sends records to the stream and says which did not land.
 *
 * `push` and `pushBatch` both arrive here. Each chunk is sent once, through
 * the SDK and its own retry, and all chunks go out together, so one failed
 * call never stops the rest. The answer lists every failed record by index,
 * sorted; an empty list means everything landed.
 */
export async function deliver(
  items: readonly DeliveryItem[],
  settings: Settings,
  env: Env | undefined,
  logger: Logger.Instance,
): Promise<DeliveryFailure[]> {
  const target: DeliveryTarget = {
    service: 'Firehose',
    resource: settings.streamName,
    region: settings.region,
  };
  const Command = env?.AWS?.PutRecordBatchCommand ?? PutRecordBatchCommand;

  const plan = planChunks(
    items.map(({ event, data }) => toPayload(event, data)),
    settings.newline,
  );

  const failures: DeliveryFailure[] = plan.refused.map(
    ({ index, code, detail, cause }) => ({
      index,
      error: localError(target, code, detail, cause),
    }),
  );

  const sendChunk = async (
    chunk: PlannedRecord[],
  ): Promise<DeliveryFailure[]> => {
    const started = Date.now();
    const bytes = chunk.reduce(
      (sum, record) => sum + record.data.byteLength,
      0,
    );
    const command = new Command({
      DeliveryStreamName: settings.streamName,
      Records: chunk.map(({ data }) => ({ Data: data })),
    });

    let result: DeliveryFailure[];
    let attempts: number | undefined;
    try {
      const raw = await settings.runtime.inflight.track(
        settings.client.send(command),
      );
      const response = readResponse(raw);
      attempts = response.attempts;
      result = chunkFailures(chunk, response, target);
    } catch (thrown) {
      attempts = readMetadata(thrown).attempts;
      const error = fromSdkError(thrown, target);
      result = chunk.map(({ index }) => ({ index, error }));
    }

    logger.debug('Firehose PutRecordBatch', {
      stream: settings.streamName,
      records: chunk.length,
      bytes,
      failed: result.length,
      attempts,
      ms: Date.now() - started,
    });

    return result;
  };

  const results = await Promise.all(plan.chunks.map(sendChunk));
  for (const result of results) failures.push(...result);

  return failures.sort((a, b) => a.index - b.index);
}

/**
 * The error thrown when nothing landed. One shared cause is thrown as is;
 * mixed causes give the most frequent code, retryable only if every record
 * was, with the counts per code in the message.
 */
export function nothingLanded(
  failures: readonly DeliveryFailure[],
): AwsDeliveryError {
  const first = failures[0].error;
  if (failures.every(({ error }) => error === first)) return first;

  const byCode = new Map<string, { count: number; sample: AwsDeliveryError }>();
  for (const { error } of failures) {
    const entry = byCode.get(error.code);
    if (entry) entry.count += 1;
    else byCode.set(error.code, { count: 1, sample: error });
  }

  let dominant = { count: 0, sample: first };
  for (const entry of byCode.values())
    if (entry.count > dominant.count) dominant = entry;

  const counts = [...byCode.entries()]
    .map(([code, { count }]) => `${count} ${code}`)
    .join(', ');

  return new AwsDeliveryError(
    `${dominant.sample.message} (all ${failures.length} records failed: ${counts})`,
    {
      code: dominant.sample.code,
      status: dominant.sample.status,
      retryable: failures.every(({ error }) => error.retryable),
      cause: dominant.sample,
    },
  );
}

/**
 * The collector's reading of a delivery: resolve when everything landed,
 * the failed indices when some did, a throw when none did.
 */
export function toOutcome(
  total: number,
  failures: readonly DeliveryFailure[],
): void | Destination.BatchOutcome {
  if (failures.length === 0) return;
  if (failures.length >= total) throw nothingLanded(failures);
  return {
    failed: failures.map(({ index, error }) => ({ index, error })),
  };
}
