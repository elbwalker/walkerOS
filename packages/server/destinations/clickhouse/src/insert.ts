import type { Readable } from 'stream';
import type { ClickHouseSettings, InsertParams } from '@clickhouse/client';
import type { Logger } from '@walkeros/core';
import { createHash } from 'node:crypto';
import { classify, errorCode } from './classify';
import {
  RETRY_JITTER_MAX,
  normalizeMaxRetries,
  resolveInsertSettings,
  retryDelay,
} from './config';
import type { InsertRow } from './eventToRow';
import type { Settings } from './types';

/**
 * One row on its way to the table, beside the id of the event it came from.
 *
 * The id travels beside the row rather than inside it because a row is not
 * guaranteed to carry one. A mapped row is whatever a flow wrote, and `id` is
 * a column a partner's table need not have. Reading the token out of the row
 * would give every id-less mapped row the same token, which
 * `deduplicationToken` explains is silent, total data loss.
 */
export interface InsertEntry {
  /** The row as it travels: a mapped object verbatim, or the conversion. */
  row: InsertRow;
  /** The walkerOS event id. The only input the token is derived from. */
  id: string;
}

/**
 * The deduplication token sent with a batch: a digest over its event ids, in
 * the order they are inserted.
 *
 * Retrying an insert without one double-counts every row of a batch the server
 * had already written when the answer stopped coming. Synchronous inserts
 * deduplicate on the block contents by themselves, but only where the window
 * is on: `non_replicated_deduplication_window` defaults to 0, so a plain
 * MergeTree does nothing unless the table says otherwise. An explicit token
 * identifies the block for both MergeTree families, but it prevents duplicates
 * only where insert deduplication is enabled: by default on a
 * ReplicatedMergeTree, and on a plain MergeTree only with a positive window.
 *
 * A digest rather than a random uuid, so a redelivery of the same events
 * produces the same token and deduplicates too, as long as it lands inside the
 * table's deduplication window, which counts blocks and not time. The ids
 * travel as a JSON array so that no id can imitate the separator between two
 * of them, and the order is part of the digest because the same rows in
 * another order are another block to ClickHouse.
 *
 * Event ids and nothing else. The server deduplicates on this token INSTEAD of
 * the block contents, and skips a repeated block while reporting success, so
 * two deliveries that share a token are one delivery with no error, no dead
 * letter entry and no counter anywhere: a token that could repeat across
 * different events is silent data loss. The ids are the one input that is
 * always present and unique per event, which the row is not, and they identify
 * the events rather than describing them, so two different events that a
 * mapping happened to shape identically stay two blocks.
 */
export function deduplicationToken(ids: readonly string[]): string {
  return createHash('sha256').update(JSON.stringify(ids)).digest('hex');
}

/**
 * How much of the base delay this wait takes: all of it, plus up to half again.
 * Two runtimes that failed on the same server-side condition would otherwise
 * retry in lockstep and meet it together a second time.
 */
function drawJitter(): number {
  return 1 + Math.random() * (RETRY_JITTER_MAX - 1);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Inserts one batch, retrying a transient failure up to `maxRetries` times.
 *
 * One flushed batch is one insert, whatever its size: the rows travel as a
 * single JSONEachRow body, and `format` is fixed because a table written in two
 * formats is a table nobody can read back.
 *
 * The parameters are built once and every attempt sends that same object, so
 * the deduplication token cannot be regenerated halfway through a retry, which
 * is the one thing that would turn a safe retry into duplicated rows.
 *
 * The delays come from the same function the per-attempt request timeout was
 * derived from, so what the loop waits and what the client was configured for
 * cannot drift apart and leave an attempt running past the collector's race.
 *
 * A failure that survives the retries is rethrown as it arrived, ClickHouse
 * code included: the collector dead-letters the whole batch on a throw and
 * keeps the error beside it, and the code is what makes that entry readable.
 */
export async function insertRows(
  entries: readonly InsertEntry[],
  settings: Settings,
  logger: Logger.Instance,
): Promise<void> {
  const { client, table } = settings;

  // What counts as a usable retry count is decided in one place for both halves
  // of the mechanism, the loop here and the budget the request timeout was
  // derived from. A count that is not a finite number would otherwise never end
  // this loop, `attempt >= NaN` and `attempt >= Infinity` being false forever,
  // and nothing cancels a destination's work once the collector has stopped
  // waiting for it.
  const retries = normalizeMaxRetries(settings.maxRetries);

  // Our defaults first, then what the flow set, then the token: a token an
  // operator could pin would collapse every insert into one deduplicated block
  // and drop every batch after the first without an error anywhere.
  const clickhouse_settings: ClickHouseSettings = {
    ...resolveInsertSettings(settings.clickhouseSettings),
    insert_deduplication_token: deduplicationToken(
      entries.map((entry) => entry.id),
    ),
  };

  const params: InsertParams<Readable, InsertRow> = {
    table,
    values: entries.map((entry) => entry.row),
    format: 'JSONEachRow',
    clickhouse_settings,
  };

  for (let attempt = 0; ; attempt += 1) {
    logger.debug('ClickHouse insert', { table, rows: entries.length, attempt });

    try {
      await client.insert(params);

      return;
    } catch (error) {
      // Classified before the budget is read, so the operator hears about a
      // terminal failure even where there was never a retry to skip.
      const retryable = classify(error, logger) === 'retryable';

      if (!retryable || attempt >= retries) throw error;

      const delay = retryDelay(attempt, drawJitter());

      // A finite but absurd retry count passes the clamp above and would spend
      // it on insert attempts against a live server. The delays double, so they
      // leave the finite range on their own after about a thousand retries, and
      // reading that as the end of the loop bounds it without inventing a
      // maximum attempt count or restating the schedule. The budget the request
      // timeout comes from ends on the matching condition: it stops when its
      // running sum stops being finite, this loop when a single delay does.
      if (!Number.isFinite(delay)) throw error;

      logger.warn('ClickHouse insert failed, retrying', {
        code: errorCode(error),
        attempt,
        delay,
      });

      await wait(delay);
    }
  }
}
