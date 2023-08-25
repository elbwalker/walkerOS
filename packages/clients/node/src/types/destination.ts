import type { Elbwalker } from '@elbwalker/types';

export interface Function<Custom = unknown, EventCustom = unknown> {
  init?: (
    config: Partial<Config<Partial<Custom>, Partial<EventCustom>>>,
  ) => Promise<boolean>;
  setup?: (
    config: Partial<Config<Partial<Custom>, Partial<EventCustom>>>,
  ) => Promise<boolean>;
  push: (
    event: Elbwalker.Event,
    config?: Config<Custom, EventCustom>,
    mapping?: EventConfig<EventCustom>,
  ) => Promise<void>; // @TODO return failed events
  config: Config<Custom, EventCustom>;
  meta: Meta;
  queue?: Array<Elbwalker.Event>; // Non processed events yet and resettet with each new run
}

export interface Config<Custom = unknown, EventCustom = unknown> {
  consent?: Elbwalker.Consent; // Required consent states to init and push events
  custom: Custom; // Arbitrary but protected configurations for custom enhancements
  init?: boolean; // If the destination has been initialized by calling the init method
  mapping?: Mapping<EventCustom>; // A map to handle events individually
}

export interface Mapping<EventCustom> {
  [entity: string]: { [action: string]: EventConfig<EventCustom> };
}

interface Meta {
  name: string;
  version: string;
}

export interface EventConfig<EventCustom = unknown> {
  consent?: Elbwalker.Consent; // Required consent states to init and push events
  custom?: EventCustom; // Arbitrary but protected configurations for custom event config
  ignore?: boolean; // Choose to no process an event when set to true
  name?: string; // Use a custom event name
}

export type PushSuccess = Array<{
  id: string;
  destination: Function;
}>;

export type PushFailure = Array<{
  id: string;
  destination: Function;
  error: unknown;
}>;
