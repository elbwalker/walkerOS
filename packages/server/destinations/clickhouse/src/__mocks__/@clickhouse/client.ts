// Recording stand-in for `createClient` from `@clickhouse/client`.
//
// Jest resolves `@clickhouse/client` to this file for every test in the
// package, so the star re-export below keeps every other SDK name (types,
// `ClickHouseError`, the format constants) reachable instead of undefined. The
// local `createClient` shadows the real one.
//
// The returned client is a plain object carrying only `insert` and `close`,
// the two methods this destination is allowed to call. Nothing from the real
// SDK is constructed, so no request can leave the process by any path.

import type { Readable } from 'stream';
import type {
  ClickHouseClientConfigOptions,
  InsertParams,
  InsertResult,
} from '@clickhouse/client';
import { ClickHouseError } from '@clickhouse/client';
import type { ClickHouseClientSurface } from '../../types';

export * from '@clickhouse/client';

/** One recorded interaction: the callable name followed by its arguments. */
export type MockCall = readonly [string, ...unknown[]];

interface Failure {
  remaining: number;
  /**
   * ClickHouse error codes are strings (like '159' for a server-side timeout
   * or '252' for too many parts). Omit it for a codeless plain Error.
   */
  code?: string;
  message: string;
  type?: string;
}

const calls: MockCall[] = [];
let failure: Failure | undefined;

/** Every interaction recorded so far, in order. */
export function __getCalls(): readonly MockCall[] {
  return calls;
}

/** Clears the capture array and any pending insert failure. */
export function __reset(): void {
  calls.length = 0;
  failure = undefined;
}

/**
 * Rejects the next `times` inserts, then lets inserts succeed again.
 *
 * With a `code` the rejection is a real `ClickHouseError` carrying that string
 * code, so retry logic is exercised against the class the server actually
 * produces. Without a `code` it is a plain `Error` with no code at all.
 */
export function __failInsert(
  times: number,
  options: { code?: string; message?: string; type?: string } = {},
): void {
  failure = {
    remaining: times,
    code: options.code,
    message: options.message ?? 'clickhouse insert failed',
    type: options.type,
  };
}

function nextFailure(): Error | undefined {
  if (!failure || failure.remaining < 1) return undefined;

  failure.remaining -= 1;
  const { code, message, type } = failure;

  return code === undefined
    ? new Error(message)
    : new ClickHouseError({ message, code, type });
}

export const createClient = (
  config: ClickHouseClientConfigOptions,
): ClickHouseClientSurface => {
  calls.push(['createClient', config]);

  return {
    async insert<T>(params: InsertParams<Readable, T>): Promise<InsertResult> {
      calls.push(['insert', params]);

      const error = nextFailure();
      if (error) throw error;

      return {
        executed: true,
        query_id: `mock-insert-${calls.length}`,
        response_headers: {},
      };
    },

    async close(): Promise<void> {
      calls.push(['close']);
    },
  };
};
