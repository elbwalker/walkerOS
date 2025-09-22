import type { DestinationServer } from '@walkeros/server-core';
import type { Mapping as WalkerOSMapping } from '@walkeros/core';
import type {
  FirehoseClient,
  FirehoseClientConfig,
  PutRecordBatchCommand,
} from '@aws-sdk/client-firehose';

export interface Destination
  extends DestinationServer.Destination<Settings, Mapping> {
  init: DestinationServer.InitFn<Settings, Mapping>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Settings, Mapping>;

export interface Settings {
  firehose?: FirehoseConfig;
}

export interface Mapping {
  // Custom destination event mapping properties
}

export type InitFn = DestinationServer.InitFn<Settings, Mapping>;
export type PushFn = DestinationServer.PushFn<Settings, Mapping>;

export type PartialConfig = DestinationServer.PartialConfig<Settings, Mapping>;

export type PushEvents = DestinationServer.PushEvents<Mapping>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

export interface FirehoseConfig {
  streamName: string;
  client?: FirehoseClient;
  region?: string;
  config?: FirehoseClientConfig;
}

// Environment interface for type-safe AWS SDK injection
export interface Environment extends DestinationServer.Environment {
  AWS: {
    FirehoseClient: typeof FirehoseClient;
    PutRecordBatchCommand: typeof PutRecordBatchCommand;
  };
}
