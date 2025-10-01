import type { Mapping as WalkerOSMapping, WalkerOS } from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

declare global {
  interface Window {
    plausible?: Plausible & { q?: IArguments[] };
  }
}

export type Plausible = (
  event: string,
  options?: { props?: WalkerOS.AnyObject },
) => void;

// Environment interface for type-safe external dependency injection
export interface Environment extends DestinationWeb.Environment {
  window: {
    plausible: Plausible & { q?: IArguments[] };
  };
}

export type Destination = DestinationWeb.Destination<Settings, Mapping>;
export type Config = DestinationWeb.Config<Settings, Mapping>;

// Plausible-specific destination type with environment support
export interface PlausibleDestination extends Destination {
  env?: Environment;
}

// Destination-specific settings (internal usage)
export interface Settings {
  domain?: string; // Name of the domain to be tracked
}

// Single event transformation rule
export interface Mapping {}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
