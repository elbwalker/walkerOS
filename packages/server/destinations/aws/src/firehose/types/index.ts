import type { DestinationServer } from '@walkerOS/server-core';
import type { Mapping as WalkerOSMapping, Elb } from '@walkerOS/core';
import type {
  FirehoseClient,
  FirehoseClientConfig,
} from '@aws-sdk/client-firehose';

declare global {
  // Augment the global WalkerOS namespace with destination-specific types
  namespace WalkerOS {
    interface Elb extends Elb.RegisterDestination<Destination, Config> {}
  }
}

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
