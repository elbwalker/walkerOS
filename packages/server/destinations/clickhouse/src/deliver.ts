import type { Destination, Logger } from '@walkeros/core';
import { isObject, StepError } from '@walkeros/core';
import { adviceFor, classify, errnoOf, errorCode } from './classify';
import { resolveSettings } from './config';
import { eventToRow } from './eventToRow';
import type { InsertEntry } from './insert';
import { insertRows } from './insert';
import type { Mapping, PartialConfig } from './types';

/**
 * One event on its way to the table, with whatever a mapping produced for it.
 * The collector's own batch entry, so a flushed batch travels here unchanged
 * and a single push builds the same shape for its one event.
 */
type Entry = Destination.BatchEntry<Mapping>;

/**
 * The row one entry contributes, and the event id that identifies it.
 *
 * A flow that mapped the event hands the row it wants in `data`, and that
 * object travels verbatim: it replaces the canonical shape wholesale, so a
 * partner whose table is not the reference DDL configures its columns in the
 * flow. Anything that is not an object means no mapping produced a row, and
 * the event is converted.
 *
 * The id comes from the event either way. A mapped row need not carry one, and
 * the deduplication token cannot be read from a value that may be absent.
 */
function toInsertEntry({ event, data }: Entry): InsertEntry {
  return {
    row: isObject(data) ? data : eventToRow(event),
    id: event.id,
  };
}

/**
 * Sends one set of entries and says what happened to them.
 *
 * Both entry points arrive here, so a single event and a flushed batch take the
 * same path: one insert, one retry budget, one line per outcome, and one place
 * that decides what a row looks like. The settings are resolved here rather
 * than in each caller because core carries them in the slot a user writes, the
 * client optional and the defaults unapplied, so they have to be narrowed once
 * per delivery.
 *
 * A failure is thrown as the package's own StepError: the collector reads a
 * throw as the whole delivery failing, every event goes to the dead letter
 * queue, one line is logged and one transport failure is recorded against the
 * destination's breaker. Swallowing the rejection would report lost events as
 * delivered.
 */
export async function deliver(
  entries: readonly Entry[],
  config: PartialConfig,
  logger: Logger.Instance,
): Promise<void> {
  const settings = resolveSettings(config);

  try {
    await insertRows(entries.map(toInsertEntry), settings, logger);
  } catch (error) {
    throw insertError(error);
  }

  // A landed delivery stays at debug. Every event that arrives produces one of
  // these, so anything louder buries the line that matters.
  logger.debug('ClickHouse insert ok', { rows: entries.length });
}

/**
 * A failed insert as the package's StepError. The message names the ClickHouse
 * code, or the Node errno of a rejection that never reached the server
 * (`ECONNRESET` is the commonest retryable failure there is), plus the advice
 * for the terminal codes that need one. Never the server's own text: it can
 * quote the rows it could not parse. The original error stays the cause.
 */
function insertError(error: unknown): StepError {
  const code = errorCode(error);
  const reason = code ? `code ${code}` : errnoOf(error);
  return new StepError(
    adviceFor(code) ??
      `ClickHouse insert failed${reason ? ` (${reason})` : ''}`,
    {
      code: 'transport',
      retryable: classify(error) === 'retryable',
      cause: error,
    },
  );
}
