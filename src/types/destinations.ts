import type { Elbwalker } from '.';

export interface Function<Custom = unknown, EventCustom = unknown> {
  init?: (config: Config<Custom, EventCustom>) => boolean;
  push: (
    event: Elbwalker.Event,
    config: Config<Custom, EventCustom>,
    mapping?: EventConfig<EventCustom>,
    runState?: Elbwalker.Config,
  ) => void;
  config: Config<Custom, EventCustom>;
  queue?: Array<Elbwalker.Event>; // Non processed events yet and resettet with each new run
  type?: string; // The type of the destination
}

export interface Config<Custom = unknown, EventCustom = unknown> {
  consent?: Elbwalker.Consent; // Required consent states to init and push events
  custom?: Custom; // Arbitrary but protected configurations for custom enhancements
  id?: string; // A unique key for the destination
  init?: boolean; // If the destination has been initialized by calling the init method
  loadScript?: boolean; // If an additional script to work should be loaded
  mapping?: Mapping<EventCustom>; // A map to handle events individually
  queue?: boolean; // Disable processing of previously pushed events
}

export interface Mapping<EventCustom> {
  [entity: string]: { [action: string]: EventConfig<EventCustom> };
}

export interface EventConfig<EventCustom = unknown> {
  consent?: Elbwalker.Consent; // Required consent states to init and push events
  custom?: EventCustom; // Arbitrary but protected configurations for custom event config
  ignore?: boolean; // Choose to no process an event when set to true
  name?: string; // Use a custom event name
}
