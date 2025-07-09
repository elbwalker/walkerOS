import type { Handler, Mapping as WalkerOSMapping, On, WalkerOS } from '.';

export interface Destination<Settings = unknown, Mapping = unknown> {
  config: Config<Settings, Mapping>; // Configuration settings for the destination
  queue?: WalkerOS.Events; // Non processed events yet and reset with each new run
  dlq?: DLQ; // Failed events
  type?: string; // The type of the destination
  init?: InitFn<Settings, Mapping>;
  push: PushFn<Settings, Mapping>;
  pushBatch?: PushBatchFn<Settings, Mapping>;
}

export interface Config<Settings = unknown, Mapping = unknown> {
  consent?: WalkerOS.Consent; // Required consent states to init and push events
  settings?: Settings; // Destination-specific configuration settings
  data?: WalkerOSMapping.Value | WalkerOSMapping.Values; // Mapping of event data
  id?: string; // A unique key for the destination
  init?: boolean; // If the destination has been initialized by calling the init method
  loadScript?: boolean; // If an additional script to work should be loaded
  mapping?: WalkerOSMapping.Rules<WalkerOSMapping.Rule<Mapping>>; // A map to handle events individually
  on?: On.Config; // On events listener rules
  policy?: Policy; // Rules for processing events
  queue?: boolean; // Disable processing of previously pushed events
  verbose?: boolean; // Enable verbose logging
  fn?: (...args: unknown[]) => unknown; // Custom function to be called
  onError?: Handler.Error; // Custom error handler
  onLog?: Handler.Log; // Custom log handler
}

export type PartialConfig<Settings = unknown, Mapping = unknown> = Config<
  Partial<Settings> | Settings,
  Partial<Mapping> | Mapping
>;

export interface Policy {
  [key: string]: WalkerOSMapping.Value;
}

export type Init = Partial<Omit<Destination, 'push'>> &
  Pick<Destination, 'push'>;

export type InitFn<Settings, Mapping> = (
  config?: PartialConfig<Settings, Mapping>,
  instance?: WalkerOS.Instance,
) => WalkerOS.PromiseOrValue<void | false | Config<Settings, Mapping>>;

export type PushFn<Settings, Mapping> = (
  event: WalkerOS.Event,
  config: Config<Settings, Mapping>,
  mapping?: WalkerOSMapping.Rule<Mapping>,
  options?: Options,
) => WalkerOS.PromiseOrValue<void>;

export type PushBatchFn<Settings, Mapping> = (
  batch: Batch<Mapping>,
  config: Config<Settings, Mapping>,
  options?: Options,
) => void;

export type PushEvent<Mapping = unknown> = {
  event: WalkerOS.Event;
  mapping?: WalkerOSMapping.Rule<Mapping>;
};
export type PushEvents<Mapping = unknown> = Array<PushEvent<Mapping>>;

export interface Batch<Mapping> {
  key: string;
  events: WalkerOS.Events;
  data: Array<Data>;
  mapping?: WalkerOSMapping.Rule<Mapping>;
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

export type DLQ = Array<[WalkerOS.Event, unknown]>;

export type Result = {
  successful: Array<Ref>;
  queued: Array<Ref>;
  failed: Array<Ref>;
};
