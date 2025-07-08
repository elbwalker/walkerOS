import type { DestinationServer } from '@walkerOS/server-collector';
import type {
  Handler,
  Destination as WalkerOSDestination,
} from '@walkerOS/types';
import type { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';

export interface Destination
  extends DestinationServer.Destination<Settings, EventMapping> {
  init: InitFn;
  push: PushFn;
}

export type InitFn = WalkerOSDestination.InitFn<Settings, EventMapping>;
export type PushFn = WalkerOSDestination.PushFn<Settings, EventMapping>;

export type Config = {
  settings: Settings;
  onLog: Handler.Log;
} & DestinationServer.Config<Settings, EventMapping>;

export type PushEvents = DestinationServer.PushEvents<EventMapping>;

export interface Settings {
  client: BigQuery;
  projectId: string;
  datasetId: string;
  tableId: string;
  location?: string;
  bigquery?: BigQueryOptions;
}

export interface EventMapping {
  // Custom destination event mapping properties
}
