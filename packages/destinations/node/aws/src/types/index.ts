import type { DestinationNode } from '@elbwalker/source-node';
import type { Handler } from '@elbwalker/types';
import type {
  FirehoseClient,
  FirehoseClientConfig,
} from '@aws-sdk/client-firehose';

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

export type PartialConfig = Partial<Config>;

export interface Custom {
  firehose?: FirehoseConfig;
}

export interface CustomEvent {
  // Custom destination event mapping properties
}

export interface FirehoseConfig {
  streamName: string;
  client?: FirehoseClient;
  region?: string;
  config?: FirehoseClientConfig;
}
