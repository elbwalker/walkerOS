import type { NodeDestination } from '@elbwalker/client-node';
import type { Handler } from '@elbwalker/types';
import type {
  FirehoseClient,
  FirehoseClientConfig,
} from '@aws-sdk/client-firehose';

export interface Destination
  extends NodeDestination.Destination<CustomConfig, CustomEventConfig> {
  init: InitFn;
}

export type PushFn = NodeDestination.PushFn<CustomConfig, CustomEventConfig>;
export type InitFn = NodeDestination.InitFn<PartialConfig, Config>;

export type Config = {
  custom: CustomConfig;
  onLog: Handler.Log;
} & NodeDestination.Config<CustomConfig, CustomEventConfig>;

export type PartialConfig = Partial<Config>;

export interface CustomConfig {
  firehose?: FirehoseConfig;
}

export interface CustomEventConfig {
  // Custom destination event mapping properties
}

export interface FirehoseConfig {
  streamName: string;
  client?: FirehoseClient;
  region?: string;
  config?: FirehoseClientConfig;
}
