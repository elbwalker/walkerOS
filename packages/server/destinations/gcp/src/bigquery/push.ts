import type { PushFn } from './types';
import { isObject, StepError } from '@walkeros/core';
import { eventToRow } from './eventToRow';
import { appendError, ensureWriter } from './writer';

// A silent rule has no row of its own: nothing to append.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await append(event, context);
};

const append: PushFn = async function (event, { config, data, logger }) {
  const settings = config.settings;
  if (!settings)
    throw new StepError('BigQuery settings missing, init() not run', {
      code: 'not-ready',
    });

  // Open the writer at the first push, or self-heal one that the connection's
  // `'error'` handler flagged broken: exactly one (re-)open attempt before
  // failing. A failed open throws, routing the event to the DLQ in-band
  // (instead of an out-of-band crash) and feeding the collector's
  // per-destination breaker. Breaker-gated: the collector does not call push
  // while the breaker is OPEN, so the open runs at most once per admitted
  // push, never in a loop.
  await ensureWriter(settings, logger);

  const { writer, datasetId, tableId } = settings;
  if (!writer)
    throw new StepError('BigQuery writer is missing', { code: 'not-ready' });

  const row = isObject(data) ? data : eventToRow(event);
  const rows = [row];

  logger.debug('Calling BigQuery Storage Write API', {
    dataset: datasetId,
    table: tableId,
    rowCount: rows.length,
  });

  let result;
  try {
    // `appendRows` answers synchronously; an injected writer (tests,
    // simulation) may answer with a promise, so its answer is awaited.
    const pending = await writer.appendRows(rows);
    result = await pending.getResult();
  } catch (err) {
    // The collector reports it and DLQ-routes the row; the SDK error (with
    // its `code`) stays the cause.
    throw new StepError('BigQuery row append threw', {
      code: 'transport',
      cause: err,
    });
  }

  // The server answered the append with an error status: nothing landed.
  const failed = appendError(result);
  if (failed) throw failed;

  if (result.rowErrors && result.rowErrors.length > 0)
    // The server rejected the row itself: a retry sends the same row. Its
    // message can quote the row, so only the code is named.
    throw new StepError(
      `BigQuery row append failed (code ${result.rowErrors[0].code})`,
      { code: 'transport', retryable: false },
    );

  logger.debug('BigQuery Storage Write API response', {
    ok: true,
    offset: result.appendResult?.offset?.value,
  });
};
