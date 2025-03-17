import type { Handler, Mapping, WalkerOS } from '.';

export interface Destination<Custom = unknown, CustomEvent = unknown> {
  config: Config<Custom, CustomEvent>; // Configuration settings for the destination
  queue?: WalkerOS.Events; // Non processed events yet and reset with each new run
  type?: string; // The type of the destination
  pushBatch?: PushBatchFn<Custom, CustomEvent>;
  push: PushFn<Custom, CustomEvent>;
  init?: InitFn<Custom, CustomEvent>;
}

export interface Config<Custom = unknown, CustomEvent = unknown> {
  consent?: WalkerOS.Consent; // Required consent states to init and push events
  custom?: Custom; // Arbitrary but protected configurations for custom enhancements
  data?: Mapping.Value | Mapping.Values; // Mapping of event data
  id?: string; // A unique key for the destination
  init?: boolean; // If the destination has been initialized by calling the init method
  loadScript?: boolean; // If an additional script to work should be loaded
  mapping?: Mapping.Config<CustomEvent>; // A map to handle events individually
  policy?: Policy; // Rules for processing events
  queue?: boolean; // Disable processing of previously pushed events
  verbose?: boolean; // Enable verbose logging
  fn?: (...args: unknown[]) => unknown; // Custom function to be called
  onError?: Handler.Error; // Custom error handler
  onLog?: Handler.Log; // Custom log handler
}

export interface Policy {
  [key: string]: Mapping.Value;
}

export type PushFn<Custom, CustomEvent> = (
  event: WalkerOS.Event,
  config: Config<Custom, CustomEvent>,
  mapping?: Mapping.EventConfig<CustomEvent>,
  options?: Options,
) => void | Promise<void>;

export type InitFn<Custom, CustomEvent> = (
  config: Config<Custom, CustomEvent>,
  instance: WalkerOS.Instance,
) => Promise<Config<Custom, CustomEvent> | false>;

export type PushEvent<CustomEvent = unknown> = {
  event: WalkerOS.Event;
  mapping?: Mapping.EventConfig<CustomEvent>;
};
export type PushEvents<CustomEvent = unknown> = Array<PushEvent<CustomEvent>>;

export type PushBatchFn<Custom, CustomEvent> = (
  batch: Batch<CustomEvent>,
  config: Config<Custom, CustomEvent>,
  options?: Options,
) => void; // @TODO Promise

export interface Batch<CustomEvent> {
  key: string;
  events: WalkerOS.Events;
  data: Array<Data>;
  mapping?: Mapping.EventConfig<CustomEvent>;
}

export interface Options {
  instance?: WalkerOS.Instance;
  data?: Data;
}

export type Data =
  | WalkerOS.Property
  | undefined
  | Array<WalkerOS.Property | undefined>;

export type Ref = {
  id: string;
  destination: Destination;
};

export type Push = {
  queue?: WalkerOS.Events;
  error?: unknown;
};

export type PushSuccess = Array<Ref>;

export type PushFailure = Array<Ref & { error: PushError }>;

export type PushError = string;

export type Result = {
  successful: PushSuccess;
  queued: PushSuccess;
  failed: PushFailure;
};
