import type { Logger } from '@walkeros/core';

/** Whether another attempt at the same insert can plausibly succeed. */
export type Classification = 'retryable' | 'terminal';

/**
 * The codes worth another attempt: server-side timeouts, a saturated query or
 * connection pool, a transport failure, a table held read-only while keeper
 * works. Each of them describes a condition that ends on its own in seconds.
 *
 * TIMEOUT_EXCEEDED and QUERY_WAS_CANCELLED are the two that may have landed
 * anyway, the server having been writing when the answer stopped coming.
 * Retrying them is only safe because every attempt of a batch carries the same
 * deduplication token.
 */
const RETRYABLE: ReadonlySet<string> = new Set([
  '159', // TIMEOUT_EXCEEDED
  '202', // TOO_MANY_SIMULTANEOUS_QUERIES
  '203', // NO_FREE_CONNECTION
  '209', // SOCKET_TIMEOUT
  '210', // NETWORK_ERROR
  '242', // TABLE_IS_READ_ONLY
  '394', // QUERY_WAS_CANCELLED
  '439', // CANNOT_SCHEDULE_TASK
  '745', // SERVER_OVERLOADED
  '999', // KEEPER_EXCEPTION
  '1017', // ASYNC_INSERT_FLUSH_TIMEOUT
]);

/**
 * What an operator has to change, for the two terminal failures where the fix
 * is neither obvious nor in the data.
 *
 * TOO_MANY_PARTS is the classic failure of naive event ingestion: too many
 * small inserts leave more active parts in a partition than merging can keep
 * up with. Retrying inside a ten second window cannot help a merge backlog and
 * adds parts to it, and the setting that names the limit is not the lever.
 *
 * Everything else terminal explains itself in the server's own message, and the
 * collector already logs every failed push, so a second line would only repeat
 * it.
 */
const ADVICE: Readonly<Record<string, string>> = {
  '252':
    'ClickHouse has too many parts in the partition and rejected the insert. ' +
    'Send fewer, larger batches: raise config.batch.size so the same rows ' +
    'arrive in fewer inserts. Raising parts_to_throw_insert is not the fix, ' +
    'it only hides the merge backlog until it is worse.',
  '60':
    'ClickHouse does not know the table. Create it with the table DDL at ' +
    'https://www.walkeros.io/docs/destinations/server/clickhouse#create-the-table ' +
    'before sending events.',
};

/**
 * The ClickHouse error code carried by a rejection of unknown shape.
 *
 * Read structurally rather than through `instanceof ClickHouseError`: a bundled
 * or duplicated copy of the client is a different class object and would fail
 * that check while carrying a perfectly good code.
 *
 * Gated on what a ClickHouse code is rather than on what a `code` property
 * might hold. The client parses the code out of the server's message with a
 * decimal-digit group and returns anything that does not match unchanged, so a
 * ClickHouse code is always a run of digits in a string. A socket-level
 * rejection reaches here with its Node errno still on it, `ECONNRESET` for the
 * keep-alive a restarting server drops, `ENOTFOUND`, `ETIMEDOUT`. Those are not
 * ClickHouse codes, and reading them as one would send the single most common
 * transient failure straight to the dead letter queue.
 */
export function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if (!('code' in error)) return undefined;

  const { code } = error;

  return typeof code === 'string' && /^\d+$/.test(code) ? code : undefined;
}

/**
 * Whether a failed insert is worth another attempt, and the one place an
 * operator is told what to change when it is not.
 *
 * The code is the classification input, never the HTTP status. ClickHouse maps
 * a few dozen codes to a status of their own and sends everything else as a
 * plain 500, so a saturated queue and an unknown column arrive
 * indistinguishable; it emits no 429 and no Retry-After at all, those come from
 * a proxy in front of it.
 *
 * A rejection carrying no ClickHouse code never got an answer from the server.
 * A keep-alive reset by a restarting node, a DNS failure, a connection refused,
 * a request that timed out on the way out: each arrives with a Node errno and
 * no code the server assigned. Nothing was rejected, so the batch retries, and
 * this is the failure class the retry exists for.
 *
 * An unreadable code errs the same way on purpose: one wasted attempt costs a
 * second, while a batch wrongly called terminal is lost for good, the collector
 * having no retry of its own and never draining its dead letter queue.
 */
export function classify(
  error: unknown,
  logger: Logger.Instance,
): Classification {
  const code = errorCode(error);

  if (code === undefined || RETRYABLE.has(code)) return 'retryable';

  const advice = ADVICE[code];

  if (advice) logger.error(advice, { code });

  return 'terminal';
}
