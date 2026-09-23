import type { Destination, Logger } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { errorCode } from './classify';
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
 * A failure is logged and rethrown as it arrived. The collector reads a throw
 * as the whole delivery failing: every event goes to the dead letter queue and
 * one transport failure is recorded against the destination's breaker.
 * Swallowing the rejection would report lost events as delivered.
 */
export async function deliver(
  entries: readonly Entry[],
  config: PartialConfig,
  logger: Logger.Instance,
): Promise<void> {
  const settings = resolveSettings(config, logger);

  try {
    await insertRows(entries.map(toInsertEntry), settings, logger);
  } catch (error) {
    // The message travels beside the code because the code is often absent: a
    // transport failure carries a Node errno, which is not a ClickHouse code
    // and is deliberately not read as one. `ECONNRESET` is the commonest
    // retryable failure there is, and a line that named neither it nor the
    // server's own text would leave an operator grepping for nothing.
    logger.error('ClickHouse insert failed', {
      code: errorCode(error),
      message: error instanceof Error ? error.message : String(error),
      rows: entries.length,
    });

    throw error;
  }

  // A landed delivery stays at debug. Every event that arrives produces one of
  // these, so anything louder buries the line that matters.
  logger.debug('ClickHouse insert ok', { rows: entries.length });
}
