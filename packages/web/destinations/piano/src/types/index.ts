import type {
  Mapping as WalkerOSMapping,
  WalkerOS,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

declare global {
  interface Window {
    pa?: PianoAnalytics;
  }
}

/**
 * Surface of the official Piano Analytics browser SDK (the `pa` global from
 * https://tag.aticdn.net/piano-analytics.js). Only the methods this
 * destination calls are declared; the SDK exposes more.
 */
export interface PianoAnalytics {
  setConfigurations(configurations: WalkerOS.AnyObject): void;
  sendEvent(name: string, data?: WalkerOS.AnyObject): void;
  sendEvents(
    events: ReadonlyArray<{ name: string; data?: WalkerOS.AnyObject }>,
  ): void;
}

export interface Settings {
  /** Piano Analytics site id (numeric), from your collection settings. */
  site: number;
  /** Collection domain endpoint, like https://xxxxxxx.pa-cd.com */
  collectDomain: string;
  /** Additional Piano `setConfigurations` options merged on init. */
  options?: WalkerOS.AnyObject;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {}

export interface Env extends DestinationWeb.Env {
  window?: {
    pa?: PianoAnalytics;
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export interface PianoDestination extends Destination {
  env?: Env;
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
