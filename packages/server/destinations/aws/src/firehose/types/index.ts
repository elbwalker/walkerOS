import type { DestinationServer } from '@walkeros/server-core';
import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type {
  FirehoseClientConfig,
  PutRecordBatchCommandInput,
} from '@aws-sdk/client-firehose';

/**
 * The part of an AWS SDK v3 client this destination calls: `send` with a
 * command. `FirehoseClient` satisfies it, and so does an injected mock (tests,
 * simulate) without a cast.
 */
export interface SendClient {
  send(command: object): Promise<unknown>;
}

export interface Settings {
  firehose?: FirehoseConfig;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {}

export interface Env extends DestinationServer.Env {
  AWS: {
    FirehoseClient: new (config: FirehoseClientConfig) => SendClient;
    PutRecordBatchCommand: new (input: PutRecordBatchCommandInput) => {
      readonly input: PutRecordBatchCommandInput;
    };
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;

export type PartialConfig = DestinationServer.PartialConfig<Types>;

export type PushEvents = DestinationServer.PushEvents<Mapping>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

export interface FirehoseConfig {
  streamName: string;
  client?: SendClient;
  region?: string;
  config?: FirehoseClientConfig;
}
