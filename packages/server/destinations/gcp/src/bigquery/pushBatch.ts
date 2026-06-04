import type { PushBatchFn } from './types';
import { isObject } from '@walkeros/core';
import { eventToRow } from './eventToRow';

/**
 * Batched push using a single appendRows call.
 *
 * Per-row failures (BigQuery's `rowErrors`) are reported back to the collector
 * as a BatchOutcome identifying the failed entries by index. The collector then
 * DLQs only those rows and counts the rest as delivered, so a later DLQ retry
 * does not re-write the already-succeeded rows (no duplicates). A whole-append
 * failure (the appendRows call itself rejects, or the writer is missing) still
 * throws, routing the entire batch to the DLQ.
 */
export const pushBatch: PushBatchFn = async (batch, { config, logger }) => {
  const settings = config.settings;
  if (!settings) return logger.throw('settings missing, init() not run');
  const { writer, datasetId, tableId } = settings;

  if (!writer) return logger.throw('writer is missing, init() not run');
  if (!datasetId) return logger.throw('datasetId is missing');
  if (!tableId) return logger.throw('tableId is missing');

  const rows = batch.entries.map((e) =>
    isObject(e.data) ? e.data : eventToRow(e.event),
  );

  if (rows.length === 0) return;

  try {
    logger.debug('Calling BigQuery Storage Write API (batch)', {
      dataset: datasetId,
      table: tableId,
      rowCount: rows.length,
    });
    const pending = writer.appendRows(rows);
    const result = await pending.getResult();

    if (result.rowErrors && result.rowErrors.length > 0) {
      const failed = result.rowErrors.length;
      // Operator-visible summary at INFO, each row error at ERROR.
      logger.info('BigQuery batch had partial failures', {
        ok: rows.length - failed,
        failed,
        rowCount: rows.length,
      });
      for (const re of result.rowErrors) {
        logger.error('BigQuery row append failed', {
          index: re.index,
          code: re.code,
          message: re.message,
        });
      }
      // Report per-row failures so the collector DLQs only the failed rows and
      // counts the succeeded rows as delivered. `re.index` is the row's
      // position in `rows`, which is built 1:1 from `batch.entries`, so it maps
      // directly to the collector's entry index. The per-row error preserves
      // the original BigQuery `code` and `message` for debugging from the DLQ.
      // The Storage Write SDK types `index` as a protobuf int64 (number, string,
      // or Long) and `message` as a nullable string, so both are normalized to
      // the strict BatchFailure shape here.
      const failures = result.rowErrors.map((re) => ({
        index: Number(re.index),
        error: Object.assign(new Error(re.message ?? 'BigQuery row error'), {
          code: re.code,
        }),
      }));

      return { failed: failures };
    }

    // Full success: keep at DEBUG to avoid noise on every batch.
    logger.debug('BigQuery batch append ok', {
      ok: rows.length,
      failed: 0,
      offset: result.appendResult?.offset?.value,
    });
  } catch (err) {
    logger.error('BigQuery batch append threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
};
