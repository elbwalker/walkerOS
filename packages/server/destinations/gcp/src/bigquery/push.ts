import type { PushFn } from './types';
import { isObject } from '@walkeros/core';
import { eventToRow } from './eventToRow';

export const push: PushFn = async function (
  event,
  { config, rule: _rule, data, logger },
) {
  const settings = config.settings;
  if (!settings) return logger.throw('settings missing, init() not run');
  const { writer, datasetId, tableId } = settings;

  if (!writer) return logger.throw('writer is missing, init() not run');
  if (!datasetId) return logger.throw('datasetId is missing');
  if (!tableId) return logger.throw('tableId is missing');

  const row = isObject(data) ? data : eventToRow(event);
  const rows = [row];

  logger.debug('Calling BigQuery Storage Write API', {
    dataset: datasetId,
    table: tableId,
    rowCount: rows.length,
  });

  let result;
  try {
    const pending = writer.appendRows(rows);
    result = await pending.getResult();
  } catch (err) {
    // Log the failure and rethrow the raw error to the collector/DLQ. Secret
    // redaction is standardized at the CLI logger handler; the raw error keeps
    // its `code` so the row stays DLQ-routable.
    logger.error('BigQuery row append threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  if (result.rowErrors && result.rowErrors.length > 0) {
    // Single-event push path: throw with row context so the caller sees the failure.
    const first = result.rowErrors[0];
    return logger.throw(
      `BigQuery row append failed: code=${first.code} message=${first.message}`,
    );
  }

  logger.debug('BigQuery Storage Write API response', {
    ok: true,
    offset: result.appendResult?.offset?.value,
  });
};
