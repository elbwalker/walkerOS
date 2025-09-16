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

export type Destination = DestinationWeb.Destination<Settings, Mapping>;
export type Config = DestinationWeb.Config<Settings, Mapping>;

// Destination-specific settings (internal usage)
export interface Settings {
  domain?: string; // Name of the domain to be tracked
}

// Single event transformation rule
export interface Mapping {}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
