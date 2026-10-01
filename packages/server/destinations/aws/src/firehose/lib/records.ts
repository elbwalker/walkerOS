export { toPayload } from '../../lib/payload';

/** Most records one `PutRecordBatch` call accepts. */
export const MAX_RECORDS_PER_CALL = 500;

/**
 * Raw bytes per call, kept below the documented 4 MiB request limit with room
 * for the base64 encoding and the JSON envelope of the request.
 */
export const MAX_BYTES_PER_CALL = 2_900_000;

/** Largest record Firehose accepts, newline included. */
export const MAX_RECORD_BYTES = 1_000_000;

/** The record bytes: the payload as JSON, plus `\n` unless `newline` is false. */
export function toRecordData(payload: unknown, newline = true): Buffer {
  const json = JSON.stringify(payload);
  if (typeof json !== 'string')
    throw new TypeError('The payload does not serialize to JSON.');
  return Buffer.from(newline ? `${json}\n` : json);
}

/** One record on its way out, with its index in the delivery. */
export interface PlannedRecord {
  index: number;
  data: Buffer;
}

/** A record refused before sending; it is never sent. */
export interface RefusedRecord {
  index: number;
  code: 'RecordTooLarge' | 'InvalidRecord';
  detail: string;
  cause?: unknown;
}

export interface Plan {
  chunks: PlannedRecord[][];
  refused: RefusedRecord[];
}

/**
 * Turns payloads into records and splits them into calls of at most
 * `MAX_RECORDS_PER_CALL` records and `MAX_BYTES_PER_CALL` bytes, in order.
 * A record that cannot be serialized or is too large is refused on its own,
 * so it never fails its neighbours.
 */
export function planChunks(
  payloads: readonly unknown[],
  newline: boolean,
): Plan {
  const chunks: PlannedRecord[][] = [];
  const refused: RefusedRecord[] = [];
  let current: PlannedRecord[] = [];
  let currentBytes = 0;

  payloads.forEach((payload, index) => {
    let data: Buffer;
    try {
      data = toRecordData(payload, newline);
    } catch (error) {
      refused.push({
        index,
        code: 'InvalidRecord',
        detail: `Record ${index} does not serialize to JSON: ${error instanceof Error ? error.message : String(error)}`,
        cause: error,
      });
      return;
    }

    if (data.byteLength > MAX_RECORD_BYTES) {
      refused.push({
        index,
        code: 'RecordTooLarge',
        detail: `Record ${index} is ${data.byteLength} bytes, over the ${MAX_RECORD_BYTES} byte limit.`,
      });
      return;
    }

    if (
      current.length >= MAX_RECORDS_PER_CALL ||
      currentBytes + data.byteLength > MAX_BYTES_PER_CALL
    ) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }

    current.push({ index, data });
    currentBytes += data.byteLength;
  });

  if (current.length > 0) chunks.push(current);
  return { chunks, refused };
}
