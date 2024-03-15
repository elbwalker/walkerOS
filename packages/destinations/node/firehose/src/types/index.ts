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
export type InitFn = (config: PartialConfig) => Promise<false | Config>;
export type SetupFn = NodeDestination.SetupFn<CustomConfig, CustomEventConfig>;

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
  client: FirehoseClient;
  streamName: string;
  firehose?: FirehoseClientConfig;
}

export interface CustomEventConfig {
  // Custom destination event mapping properties
}
