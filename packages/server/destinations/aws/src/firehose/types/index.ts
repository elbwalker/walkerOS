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
  extends DestinationServer.Destination<Custom, CustomEvent> {
  init: InitFn;
  push: PushFn;
}

export type InitFn = WalkerOSDestination.InitFn<Custom, CustomEvent>;
export type PushFn = WalkerOSDestination.PushFn<Custom, CustomEvent>;

export type Config = {
  custom: Custom;
  onLog: Handler.Log;
} & DestinationServer.Config<Custom, CustomEvent>;

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
