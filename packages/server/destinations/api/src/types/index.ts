import type {
  Mapping as WalkerOSMapping,
  SendDataValue,
  SendHeaders,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Settings {
  url: string;
  headers?: SendHeaders;
  method?: string;
  transform?: Transform;
  timeout?: number;
}

export interface Mapping {}

export interface Env extends DestinationServer.Env {
  sendServer?: typeof sendServer;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env>;

export type Destination = DestinationServer.Destination<Types>;
export type Config = DestinationServer.Config<Types>;
export type PushFn = DestinationServer.PushFn<Types>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

export type Transform = (
  data?: unknown,
  config?: Config,
  mapping?: WalkerOSMapping.Rule<Mapping>,
) => SendDataValue;
