import type { DestinationServer } from '@walkerOS/server-collector';
import type {
  Handler,
  Destination as WalkerOSDestination,
} from '@walkerOS/types';
import type {
  FirehoseClient,
  FirehoseClientConfig,
} from '@aws-sdk/client-firehose';

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

export interface Settings {
  firehose?: FirehoseConfig;
}

export interface Mapping {
  // Custom destination event mapping properties
}

export interface FirehoseConfig {
  streamName: string;
  client?: FirehoseClient;
  region?: string;
  config?: FirehoseClientConfig;
}
