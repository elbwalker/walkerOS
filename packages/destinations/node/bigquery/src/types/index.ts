import type { NodeDestination } from '@elbwalker/node-client';
import type { Elbwalker } from '@elbwalker/types';
import type { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';

export interface Function
  extends NodeDestination.Function<CustomConfig, CustomEventConfig> {
  // @TODO init as static method
}

export type Config = NodeDestination.Config<CustomConfig, CustomEventConfig>;
export type PartialConfig = NodeDestination.Config<
  Partial<CustomConfig>,
  Partial<CustomEventConfig>
>;

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
  globals?: string;
  user?: Elbwalker.User;
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
    server?: string;
  };
  source?: {
    type?: string;
    id?: string;
    previous_id?: string;
  };
  server_timestamp: Date;
  additional_data?: string; // @TODO move to custom
}
