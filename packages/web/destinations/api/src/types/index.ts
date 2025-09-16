import type {
  Mapping as WalkerOSMapping,
  SendDataValue,
  SendHeaders,
} from '@walkeros/core';
import type { DestinationWeb, sendWeb } from '@walkeros/web-core';
import type { SendWebTransport } from '@walkeros/web-core';

export interface Environment {
  sendWeb: typeof sendWeb;
}

export type Destination = DestinationWeb.Destination<Settings, Mapping>;
export type Config = DestinationWeb.Config<Settings, Mapping>;

// Destination-specific settings (internal usage)
export interface Settings {
  url: string;
  headers?: SendHeaders;
  method?: string;
  transform?: Transform;
  transport?: SendWebTransport;
}

// Single event transformation rule
export interface Mapping {}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

export type Transform = (
  data?: unknown,
  config?: Config,
  mapping?: WalkerOSMapping.Rule<Mapping>,
) => SendDataValue;
