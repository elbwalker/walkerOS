import type { DestinationNode } from '@elbwalker/source-node';
import type { Handler } from '@elbwalker/types';
import type { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';

export interface Destination
  extends DestinationNode.Destination<Custom, CustomEvent> {
  init: InitFn;
}

export type PushFn = DestinationNode.PushFn<Custom, CustomEvent>;
export type InitFn = DestinationNode.InitFn<PartialConfig, Config>;

export type Config = {
  custom: Custom;
  onLog: Handler.Log;
} & DestinationNode.Config<Custom, CustomEvent>;

export type PartialConfig = DestinationNode.Config<
  Partial<Custom>,
  Partial<CustomEvent>
>;

export type PushEvents = DestinationNode.PushEvents<CustomEvent>;

export interface Custom {
  client: BigQuery;
  projectId: string;
  datasetId: string;
  tableId: string;
  location?: string;
  bigquery?: BigQueryOptions;
}

export interface CustomEvent {
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
  entity?: string;
  action?: string;
  timing?: number;
  group?: string;
  count?: number;
  version?: string; // stringified
  source?: string; // stringified
}
