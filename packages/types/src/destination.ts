import type { Handler, WalkerOS } from '.';

export interface Function<Custom = unknown, EventCustom = unknown> {
  config: Config<Custom, EventCustom>;
  queue?: Queue; // Non processed events yet and resettet with each new run
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
  [entity: string]: { [action: string]: EventConfig<EventCustom> };
}

export type Meta = {
  name: string;
  version: string;
};

export interface EventConfig<EventCustom = unknown> {
  consent?: WalkerOS.Consent; // Required consent states to init and push events
  custom?: EventCustom; // Arbitrary but protected configurations for custom event config
  ignore?: boolean; // Choose to no process an event when set to true
  name?: string; // Use a custom event name
}

export type Queue = Array<WalkerOS.Event>;
