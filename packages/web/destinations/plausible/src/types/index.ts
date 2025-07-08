import type { Mapping, WalkerOS } from '@walkerOS/types';
import type { DestinationWeb } from '@walkerOS/web-collector';

declare global {
  interface Window {
    plausible?: Plausible & { q?: IArguments[] };
  }
}

export type Plausible = (
  event: string,
  options?: { props?: WalkerOS.AnyObject },
) => void;

export type Destination = DestinationWeb.Destination<Settings, EventMapping>;
export type Config = DestinationWeb.Config<Settings, EventMapping>;

// Destination-specific settings (internal usage)
export interface Settings {
  domain?: string; // Name of the domain to be tracked
}

// Single event transformation rule
export interface EventMapping {}

export type EventConfig = Mapping.EventConfig<EventMapping>;
