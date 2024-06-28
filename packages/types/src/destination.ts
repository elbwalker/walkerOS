import type { Handler, WalkerOS } from '.';

export interface Destination<Custom = unknown, EventCustom = unknown> {
  config: Config<Custom, EventCustom>; // Configuration settings for the destination
  queue?: Queue; // Non processed events yet and reset with each new run
  type?: string; // The type of the destination
}

export interface Config<Custom = unknown, EventCustom = unknown> {
  consent?: WalkerOS.Consent; // Required consent states to init and push events
  custom?: Custom; // Arbitrary but protected configurations for custom enhancements
  id?: string; // A unique key for the destination
  init?: boolean; // If the destination has been initialized by calling the init method
  loadScript?: boolean; // If an additional script to work should be loaded
  mapping?: Mapping<EventCustom>; // A map to handle events individually
  meta?: Meta; // Additional meta information about the destination
  queue?: boolean; // Disable processing of previously pushed events
  verbose?: boolean; // Enable verbose logging
  onError?: Handler.Error; // Custom error handler
  onLog?: Handler.Log; // Custom log handler
}

export interface Mapping<EventCustom> {
  [entity: string]: undefined | { [action: string]: EventConfig<EventCustom> };
}

export interface Batch<EventCustom> {
  key: string;
  events: Array<WalkerOS.Event>;
  mapping?: EventConfig<EventCustom>;
}

export type Meta = {
  name: string;
  version: string;
};

export interface EventConfig<EventCustom = unknown> {
  batch?: number; // Bundle events for batch processing
  batched?: Batch<EventCustom>; // Batch of events to be processed
  consent?: WalkerOS.Consent; // Required consent states to init and push events
  custom?: EventCustom; // Arbitrary but protected configurations for custom event config
  ignore?: boolean; // Choose to no process an event when set to true
  name?: string; // Use a custom event name
}

export type Queue = Array<WalkerOS.Event>;
