import type { PushBatchFn } from './types';
import { isObject } from '@walkeros/core';
import { eventToRow } from './eventToRow';

/**
 * Batched push using a single appendRows call.
 *
 * Returns void (per PushBatchFn signature). Throwing inside an async body
 * would produce an unhandled rejection in the collector's debounced batch path
 * and silently drop batches. So: log, do not throw.
 */
export const pushBatch: PushBatchFn = (batch, { config, logger }) => {
  const settings = config.settings;
  if (!settings) {
    logger.error('pushBatch: settings missing, init() not run');
    return;
  }
  const { writer, datasetId, tableId } = settings;

  if (!writer) {
    logger.error('pushBatch: writer missing, init() not run');
    return;
  }
  if (!datasetId || !tableId) {
    logger.error('pushBatch: datasetId/tableId missing');
    return;
  }

  const rows = batch.events.map((event, i) => {
    const data = batch.data[i];
    return isObject(data) ? data : eventToRow(event);
  });

  if (rows.length === 0) return;

  // Fire-and-forget the async call. PushBatchFn returns void by contract.
  // Wrap in IIFE so we can await internally and log all outcomes without leaking rejections.
  void (async () => {
    try {
      logger.debug('Calling BigQuery Storage Write API (batch)', {
        dataset: datasetId,
        table: tableId,
        rowCount: rows.length,
      });
      const pending = writer.appendRows(rows);
      const result = await pending.getResult();

      if (result.rowErrors && result.rowErrors.length > 0) {
        // Partial failure (per Resolved Decision #5): log a summary at INFO
        // for operator visibility, then each row error at ERROR. Never throw.
        const failed = result.rowErrors.length;
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
        return;
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
    }
  })();
};
