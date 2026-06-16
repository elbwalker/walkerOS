import type { DestinationServer } from '@walkeros/server-core';
import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
  SetupFn as CoreSetupFn,
  Credential,
  ServiceAccount,
} from '@walkeros/core';
import type { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import type { managedwriter } from '@google-cloud/bigquery-storage';
import type {
  WriterHandles,
  StreamConnection as WriterConnection,
  RemoveListener as WriterRemoveListener,
} from '../writer';

export interface Settings {
  client: BigQuery;
  projectId: string;
  datasetId: string;
  tableId: string;
  location?: string;
  bigquery?: BigQueryOptions;
  // Runtime-only handles populated by init(); not user-facing.
  writeClient?: managedwriter.WriterClient;
  writer?: managedwriter.JSONWriter;
  // The StreamConnection the writer appends to. Held so the connection-error
  // listener can be removed on re-open/destroy. Runtime-only.
  connection?: WriterConnection;
  // The `{ off }` disposable for the connection-error listener. Runtime-only.
  connectionErrorListener?: WriterRemoveListener;
  /**
   * Set by the connection's `'error'` handler when the long-lived stream
   * errored out-of-band. The next push self-heals (one re-open attempt) before
   * failing; while set, push/pushBatch route the event to the DLQ. Runtime-only.
   */
  writerBroken?: boolean;
  /** The last out-of-band stream error, surfaced in the DLQ-routed message. Runtime-only. */
  lastStreamError?: Error;
  /**
   * Lazy re-open hook, wired by init(). Closes over the openWriter args plus
   * `reportError`/logger so the push path can self-heal a broken writer without
   * the destination needing the original init context. Runtime-only.
   */
  reopenWriter?: () => Promise<WriterHandles>;
  /**
   * The in-flight self-heal re-open, memoized so concurrent pushes admitted in
   * the same breaking pass (the collector fans out a destination's events with
   * Promise.all) await ONE re-open instead of each closing+re-opening, which
   * would orphan a gRPC connection + live 'error' listener per redundant
   * attempt. Cleared in a finally so a later push after a failed re-open
   * retries. Runtime-only.
   */
  reopenInFlight?: Promise<void>;
}

export interface InitSettings {
  projectId: string;
  client?: BigQuery;
  datasetId?: string;
  tableId?: string;
  location?: string;
  bigquery?: BigQueryOptions;
  // Runtime-only handles populated by init(); not user-facing.
  writeClient?: managedwriter.WriterClient;
  writer?: managedwriter.JSONWriter;
  connection?: WriterConnection;
  connectionErrorListener?: WriterRemoveListener;
  writerBroken?: boolean;
  lastStreamError?: Error;
  reopenWriter?: () => Promise<WriterHandles>;
  reopenInFlight?: Promise<void>;
}

export interface Mapping {}

/** Credentials value for this destination: JSON string or service account object. */
export type Credentials = Credential<ServiceAccount>;

/**
 * Provisioning options for `walkeros setup destination.bigquery`.
 * Triggered only by the explicit CLI command. Idempotent, never auto-run.
 *
 * `projectId`, `datasetId`, `tableId` are read from `settings` (not duplicated here)
 * so a single source of truth governs both setup and runtime push.
 */
export interface Setup {
  /** Geographic location for the dataset. Default: 'EU'. */
  location?: string;
  /** Storage billing model. PHYSICAL is cheaper for compressible JSON. Default: 'PHYSICAL'. */
  storageBillingModel?: 'LOGICAL' | 'PHYSICAL';
  /** Time partitioning for the table. Default: { type: 'DAY', field: 'timestamp' }. */
  partitioning?: {
    type: 'DAY' | 'HOUR' | 'MONTH' | 'YEAR';
    field: string;
  };
  /** Clustering for cheap event-name filters. Default: { fields: ['name', 'entity', 'action'] }. */
  clustering?: { fields: string[] };
  /** Override the schema fields (15 columns by default, walkerOS Event v4 order). */
  schema?: SetupSchemaField[];
}

/** Single column in the BQ schema (subset of @google-cloud/bigquery's TableField). */
export interface SetupSchemaField {
  name: string;
  type: 'STRING' | 'JSON' | 'TIMESTAMP' | 'INT64' | 'BOOL' | 'FLOAT64';
  mode?: 'NULLABLE' | 'REQUIRED' | 'REPEATED';
}

export interface Env extends DestinationServer.Env {
  BigQuery?: typeof BigQuery;
  // SDK-shaped mocks for tests/examples. Optional at runtime; populated in test envs.
  WriterClient?: typeof managedwriter.WriterClient;
  JSONWriter?: typeof managedwriter.JSONWriter;
  adapt?: typeof import('@google-cloud/bigquery-storage').adapt;
  managedwriterModule?: typeof managedwriter;
}

export type Types = CoreDestination.Types<
  Settings,
  Mapping,
  Env,
  InitSettings,
  Setup,
  Credentials
>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type PushBatchFn = CoreDestination.PushBatchFn<Types>;
export type SetupFn = CoreSetupFn<Config, Env>;

export type PartialConfig = DestinationServer.PartialConfig<Types>;

export type PushEvents = DestinationServer.PushEvents<Mapping>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
