import type {
  Mapping as WalkerOSMapping,
  SendDataValue,
  SendHeaders,
  Elb,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';
import type { SendWebTransport } from '@walkeros/web-core';

declare global {
  // Augment the global WalkerOS namespace with destination-specific types
  namespace WalkerOS {
    interface Elb extends Elb.RegisterDestination<Destination, Config> {}
  }
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
