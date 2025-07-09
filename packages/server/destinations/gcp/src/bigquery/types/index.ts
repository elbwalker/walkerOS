import type { DestinationServer } from '@walkerOS/server-collector';
import type {
  Handler,
  Mapping as WalkerOSMapping,
  Destination as WalkerOSDestination,
} from '@walkerOS/types';
import type { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';

export interface Destination
  extends DestinationServer.Destination<Settings, Mapping> {
  init: InitFn;
  push: PushFn;
}

export type InitFn = WalkerOSDestination.InitFn<Settings, Mapping>;
export type PushFn = WalkerOSDestination.PushFn<Settings, Mapping>;

export type Config = {
  settings: Settings;
  onLog: Handler.Log;
} & DestinationServer.Config<Settings, Mapping>;

export type PushEvents = DestinationServer.PushEvents<Mapping>;

export interface Settings {
  client: BigQuery;
  projectId: string;
  datasetId: string;
  tableId: string;
  location?: string;
  bigquery?: BigQueryOptions;
}

export interface Mapping {
  // Custom destination event mapping properties
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
