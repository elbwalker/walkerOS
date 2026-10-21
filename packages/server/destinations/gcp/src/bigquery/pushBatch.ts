import type { PushBatchFn } from './types';
import { isObject, StepError } from '@walkeros/core';
import { eventToRow } from './eventToRow';
import { ensureWriter } from './writer';

/**
 * Batched push using a single appendRows call.
 *
 * Per-row failures (BigQuery's `rowErrors`) are reported back to the collector
 * as a BatchOutcome identifying the failed entries by index. The collector then
 * DLQs only those rows and counts the rest as delivered, so a later DLQ retry
 * does not re-write the already-succeeded rows (no duplicates). A whole-append
 * failure (the appendRows call itself rejects, or the writer cannot be opened)
 * still throws, routing the entire batch to the DLQ. The collector writes the
 * failure lines; this package writes none of its own.
 */
export const pushBatch: PushBatchFn = async (batch, { config, logger }) => {
  const settings = config.settings;
  if (!settings)
    throw new StepError('BigQuery settings missing, init() not run', {
      code: 'not-ready',
    });

  // A silent rule has no row of its own. Entry indexes stay those of the
  // flushed batch, which the collector maps failures back to.
  const sent = batch.entries.flatMap((entry, index) =>
    entry.rule?.silent ? [] : [{ entry, index }],
  );
  if (sent.length === 0) return;

  // Open the writer at the first push, or self-heal a broken one (one
  // re-open attempt) before failing. On a failed open this throws, routing the
  // WHOLE batch to the DLQ in-band and feeding the collector's
  // per-destination breaker. Breaker-gated by the collector, so the open runs
  // at most once per admitted batch.
  await ensureWriter(settings, logger);

  const { writer, datasetId, tableId } = settings;
  if (!writer)
    throw new StepError('BigQuery writer is missing', { code: 'not-ready' });

  const rows = sent.map(({ entry }) =>
    isObject(entry.data) ? entry.data : eventToRow(entry.event),
  );

  logger.debug('Calling BigQuery Storage Write API (batch)', {
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
    // The whole batch routes to the DLQ; the collector reports it once.
    throw new StepError('BigQuery batch append threw', {
      code: 'transport',
      cause: err,
    });
  }

  if (result.rowErrors && result.rowErrors.length > 0) {
    // Report per-row failures so the collector DLQs only the failed rows and
    // counts the succeeded rows as delivered. `re.index` is the row's position
    // in `rows`, mapped back to the entry's index in the flushed batch. The
    // Storage Write SDK types `index` as a protobuf int64 (number, string, or
    // Long), normalized here. A row error's message can quote the row, so the
    // error names only its code.
    const failures = result.rowErrors.map((re) => ({
      index: sent[Number(re.index)]?.index ?? Number(re.index),
      error: new StepError(`BigQuery row append failed (code ${re.code})`, {
        code: 'transport',
        retryable: false,
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
};
