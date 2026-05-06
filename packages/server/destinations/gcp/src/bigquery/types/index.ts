import type { DestinationServer } from '@walkeros/server-core';
import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
  SetupFn as CoreSetupFn,
} from '@walkeros/core';
import type { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import type { managedwriter } from '@google-cloud/bigquery-storage';

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
}

export interface Mapping {}

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
  Setup
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

// Local override of PartialConfig to forward the Setup (`U`) type arg.
// CoreDestination.PartialConfig only forwards Settings/Mapping/Env, leaving
// `setup` typed as `unknown`, which is not assignable back into Config.
export type PartialConfig = Omit<Config, 'settings' | 'setup'> & {
  settings?: Partial<Settings> | Settings;
  setup?: boolean | Setup;
};

export type PushEvents = DestinationServer.PushEvents<Mapping>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
