/**
 * Metadata managed by the runtime. Do not overwrite from step code.
 * The _ prefix signals "runtime-managed."
 */
export interface IngestMeta {
  /** Number of steps this data has passed through. */
  hops: number;
  /** Ordered list of step IDs visited. path[0] is always the source ID. */
  path: string[];
}

/**
 * Mutable shared context that accumulates knowledge as data flows through the graph.
 *
 * Event = strict schema (analytics data).
 * Ingest = wild west (pipeline context).
 *
 * Any step can read and write arbitrary keys. The `_meta` section is
 * managed by the runtime — increment hops and append to path before each step.
 */
export interface Ingest {
  [key: string]: unknown;
  _meta: IngestMeta;
}

/** Create a fresh Ingest for a new pipeline invocation. */
export function createIngest(sourceId: string): Ingest {
  return {
    _meta: {
      hops: 0,
      path: [sourceId],
    },
  };
}
