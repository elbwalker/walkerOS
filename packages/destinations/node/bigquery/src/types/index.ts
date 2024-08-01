import type { NodeDestination } from '@elbwalker/client-node';
import type { Handler } from '@elbwalker/types';
import type { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';

export interface Destination
  extends NodeDestination.Destination<CustomConfig, CustomEventConfig> {
  init: InitFn;
}

export type PushFn = NodeDestination.PushFn<CustomConfig, CustomEventConfig>;
export type InitFn = (config: PartialConfig) => Promise<false | Config>;

export type Config = {
  custom: CustomConfig;
  onLog: Handler.Log;
} & NodeDestination.Config<CustomConfig, CustomEventConfig>;
export type PartialConfig = NodeDestination.Config<
  Partial<CustomConfig>,
  Partial<CustomEventConfig>
>;

export type PushEvents = NodeDestination.PushEvents<CustomEventConfig>;

export interface CustomConfig {
  client: BigQuery;
  projectId: string;
  datasetId: string;
  tableId: string;
  location?: string;
  bigquery?: BigQueryOptions;
}

export interface CustomEventConfig {
  // Custom destination event mapping properties
}

export interface Row {
  timestamp: Date;
  event: string;
  createdAt: Date;
  data?: string; // stringified
  context?: string; // stringified
  globals?: string; // stringified
  custom?: string; // stringified
  user?: string; // stringified
  nested?: string; // stringified
  consent?: string; // stringified
  id?: string;
  trigger?: string;
  entity: string;
  action: string;
  timing?: number;
  group?: string;
  count?: number;
  version?: string; // stringified
  source?: string; // stringified
}
