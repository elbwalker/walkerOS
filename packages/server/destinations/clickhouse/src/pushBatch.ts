import { deliver } from './deliver';
import type { PushBatchFn } from './types';

/**
 * Sends one flushed batch as a single insert, its rows in entry order.
 *
 * There are two answers and no third one. Resolving tells the collector the
 * whole batch landed; throwing tells it the whole batch did not, and it dead
 * letters every entry and records one transport failure.
 *
 * The per-entry outcome the contract also allows has no meaning here. A
 * ClickHouse insert succeeds or fails as a whole and names no row, so such an
 * outcome would have to claim every index, and the collector counts an outcome
 * where nothing succeeded as neither a success nor a failure: a total outage
 * would pass the breaker unseen. This destination never returns one.
 */
export const pushBatch: PushBatchFn = async (batch, { config, logger }) => {
  // A silent rule has no insert of its own. With nothing left to send there is
  // nothing to report: an insert of no rows would spend a round trip, and a
  // deduplication token, on an empty block.
  const entries = batch.entries.filter((entry) => !entry.rule?.silent);
  if (entries.length) await deliver(entries, config, logger);
};
