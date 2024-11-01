import type { Handler, Mapping, WalkerOS } from '.';

export interface Destination<Custom = unknown, CustomEvent = unknown> {
  config: Config<Custom, CustomEvent>; // Configuration settings for the destination
  queue?: Queue; // Non processed events yet and reset with each new run
  type?: string; // The type of the destination
  pushBatch?: PushBatchFn<Custom, CustomEvent>;
}

export interface Config<Custom = unknown, CustomEvent = unknown> {
  consent?: WalkerOS.Consent; // Required consent states to init and push events
  custom?: Custom; // Arbitrary but protected configurations for custom enhancements
  id?: string; // A unique key for the destination
  init?: boolean; // If the destination has been initialized by calling the init method
  loadScript?: boolean; // If an additional script to work should be loaded
  mapping?: Mapping.Config<CustomEvent>; // A map to handle events individually
  queue?: boolean; // Disable processing of previously pushed events
  verbose?: boolean; // Enable verbose logging
  onError?: Handler.Error; // Custom error handler
  onLog?: Handler.Log; // Custom log handler
}

export type PushEvent<CustomEvent = unknown> = {
  event: WalkerOS.Event;
  mapping?: Mapping.Event<CustomEvent>;
};
export type PushEvents<CustomEvent = unknown> = Array<PushEvent<CustomEvent>>;

export type PushBatchFn<Custom, CustomEvent> = (
  batch: Batch<CustomEvent>,
  config: Config<Custom, CustomEvent>,
  instance?: WalkerOS.Instance,
) => void; // @TODO Promise

export interface Batch<CustomEvent> {
  key: string;
  events: Array<WalkerOS.Event>;
  mapping?: Mapping.Event<CustomEvent>;
}

export type Queue = Array<WalkerOS.Event>;
