import type {
  Mapping as WalkerOSMapping,
  SendDataValue,
  SendHeaders,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Environment extends DestinationServer.Environment {
  sendServer?: typeof sendServer;
}

export type Destination = DestinationServer.Destination<Settings, Mapping>;
export type Config = DestinationServer.Config<Settings, Mapping>;

export interface Settings {
  url: string;
  headers?: SendHeaders;
  method?: string;
  transform?: Transform;
  timeout?: number;
}

export interface Mapping {}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

export type Transform = (
  data?: unknown,
  config?: Config,
  mapping?: WalkerOSMapping.Rule<Mapping>,
) => SendDataValue;
