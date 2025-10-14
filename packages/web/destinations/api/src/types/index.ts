import type {
  Mapping as WalkerOSMapping,
  SendDataValue,
  SendHeaders,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb, sendWeb } from '@walkeros/web-core';
import type { SendWebTransport } from '@walkeros/web-core';

export interface Settings {
  url: string;
  headers?: SendHeaders;
  method?: string;
  transform?: Transform;
  transport?: SendWebTransport;
}

export interface Mapping {}

export interface Env extends DestinationWeb.Env {
  sendWeb?: typeof sendWeb;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

export type Transform = (
  data?: unknown,
  config?: Config,
  mapping?: WalkerOSMapping.Rule<Mapping>,
) => SendDataValue;
