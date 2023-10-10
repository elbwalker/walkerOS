import type { NodeDestination } from '@elbwalker/client-node';
import type { Destination, WalkerOS } from '@elbwalker/types';
import type { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';

export interface Function
  extends NodeDestination.Function<CustomConfig, CustomEventConfig> {
  init: InitFn;
}

export type PushFn = NodeDestination.PushFn<CustomConfig, CustomEventConfig>;
export type InitFn = (config: PartialConfig) => Promise<false | Config>;
export type SetupFn = NodeDestination.SetupFn<CustomConfig, CustomEventConfig>;

export type Config = {
  custom: CustomConfig;
  meta: Destination.Meta;
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
  event: string;
  data?: string;
  context?: string;
  custom?: string;
  globals?: string;
  user?: WalkerOS.User;
  nested?: string;
  consent: string;
  id: string;
  trigger?: string;
  entity: string;
  action: string;
  timestamp: Date;
  timing?: number;
  group?: string;
  count?: number;
  version?: {
    client?: string;
    tagging?: number;
  };
  source?: {
    type?: string;
    id?: string;
    previous_id?: string;
  };
  server_timestamp: Date;
}
