import type { PushBatchFn } from './types';
import { isObject } from '@walkeros/core';
import { eventToRow } from './eventToRow';

/**
 * Batched push using a single appendRows call.
 *
 * Errors (row errors or a failed append call) propagate to the collector's
 * batch flush boundary, which routes the whole batch to the DLQ and increments
 * the failed counter.
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
      // Throw on any partial failure: the collector flush boundary is atomic
      // per batch, so the WHOLE batch (succeeded rows included) routes to the
      // DLQ and counts as failed. Precise per-row accounting would require a
      // separate PushBatchFn->collector contract change.
      const first = result.rowErrors[0];
      throw new Error(
        `BigQuery batch append failed: ${failed} of ${rows.length} rows, first error code=${first.code} message=${first.message}`,
      );
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
