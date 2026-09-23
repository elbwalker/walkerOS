import type {
  Collector,
  Ingest,
  RespondFn,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { createIngest } from '@walkeros/core';
import { completeEvent } from './handle';
import { emitCollectorDrop } from './observerEmit';
import { runTransformerChain } from './transformer';

/** Chain path of the collector's own chain (`collector.config.next`). */
export const COLLECTOR_NEXT_PATH = 'collector.next';

/** What `collector.next` hands to the destination fan-out. */
export interface CollectorNextResult {
  /**
   * Every finished copy, in order, with its own ingest; each event is
   * completed to a full event. One copy without a fork, one per surviving
   * fork after a `many` or a `Result[]` return, and none when the chain
   * dropped or halted the event.
   */
  copies: Transformer.ChainCopy<WalkerOS.Event>[];
  /** The respond in scope after the chain (a wrapped one if the chain set it). */
  respond?: RespondFn;
  /** Set when a route stop or a transformer ended every copy. */
  dropped?: true;
}

/**
 * Runs the collector's own chain (`collector.config.next`) for one completed
 * event, through the one chain runner. Called once per event by
 * `pushToDestinations`, before the event enters `collector.queue` and the
 * destination fan-out, so consent replay and late-destination backfill
 * deliver post-chain events and never run it again.
 *
 * A drop (route `stop` or a transformer returning `false`) on every copy
 * emits one `collector.push` `skip` / `dropped` record and counts the event
 * in; a `cache.stop` HIT halts delivery without a drop record, as at
 * `source.next`.
 */
export async function runCollectorNext(
  collector: Collector.Instance,
  event: WalkerOS.Event,
  meta: { id?: string; ingest?: Ingest; respond?: RespondFn } = {},
): Promise<CollectorNextResult> {
  const ingest = meta.ingest ?? createIngest(meta.id || 'unknown');
  const next = collector.config.next;
  if (next === undefined) {
    return { copies: [{ event, ingest }], respond: meta.respond };
  }

  const result = await runTransformerChain(
    collector,
    collector.transformers || {},
    next,
    event,
    ingest,
    meta.respond,
    COLLECTOR_NEXT_PATH,
  );
  const respond = result.respond ?? meta.respond;

  if (result.copies.length === 0) {
    collector.logger.debug(
      `Event dropped by collector.next${
        result.droppedBy ? ` (${result.droppedBy})` : ''
      }`,
    );
    emitCollectorDrop(
      collector,
      event,
      ingest,
      result.droppedBy,
      COLLECTOR_NEXT_PATH,
    );
    return { copies: [], respond, dropped: true };
  }

  // A `cache.stop` HIT: the chain halted on purpose, nothing is delivered.
  if (result.stopped) return { copies: [], respond };

  // The runner owns identity (every copy keeps or derives its id). Only
  // missing fields are completed: the chain's edits to globals, user and
  // consent stand.
  return {
    copies: result.copies.map((copy) => ({
      event: completeEvent(collector, copy.event, copy.ingest),
      ingest: copy.ingest,
    })),
    respond,
  };
}
