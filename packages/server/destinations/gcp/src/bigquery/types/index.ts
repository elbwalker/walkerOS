import type { DestinationServer } from '@walkeros/server-core';
import type { Mapping as WalkerOSMapping } from '@walkeros/core';
import type { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';

export interface Env extends DestinationServer.Env {
  BigQuery?: typeof BigQuery;
}

export interface Destination
  extends DestinationServer.Destination<Settings, Mapping, Env> {
  init: DestinationServer.InitFn<Settings, Mapping, Env>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Settings, Mapping, Env>;

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

export type InitFn = DestinationServer.InitFn<Settings, Mapping, Env>;
export type PushFn = DestinationServer.PushFn<Settings, Mapping, Env>;

export type PartialConfig = DestinationServer.PartialConfig<
  Settings,
  Mapping,
  Env
>;

export type PushEvents = DestinationServer.PushEvents<Mapping>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
