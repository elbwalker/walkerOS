import type {
  Collector,
  Handler,
  Mapping as WalkerOSMapping,
  On,
  WalkerOS,
} from '.';

export interface Instance<Settings = unknown, Mapping = unknown> {
  config: Config<Settings, Mapping>; // Configuration settings for the destination
  queue?: WalkerOS.Events; // Non processed events yet and reset with each new run
  dlq?: DLQ; // Failed events
  type?: string; // The type of the destination
  env?: Env; // Environment requirements (browser APIs, globals, etc.)
  init?: InitFn<Settings, Mapping>;
  push: PushFn<Settings, Mapping>;
  pushBatch?: PushBatchFn<Settings, Mapping>;
  on?: On.OnFn;
}

export interface Config<Settings = unknown, Mapping = unknown> {
  consent?: WalkerOS.Consent; // Required consent states to init and push events
  settings?: Settings; // Destination-specific configuration settings
  data?: WalkerOSMapping.Value | WalkerOSMapping.Values; // Mapping of event data
  env?: Env; // Environment override for testing/simulation
  id?: string; // A unique key for the destination
  init?: boolean; // If the destination has been initialized by calling the init method
  loadScript?: boolean; // If an additional script to work should be loaded
  mapping?: WalkerOSMapping.Rules<WalkerOSMapping.Rule<Mapping>>; // A map to handle events individually
  policy?: Policy; // Rules for processing events
  queue?: boolean; // Disable processing of previously pushed events
  verbose?: boolean; // Enable verbose logging
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

export type Init<Settings = unknown, Mapping = unknown> = {
  code: Instance<Settings, Mapping>;
  config?: Partial<Config<Settings, Mapping>>;
  env?: Partial<Env>;
};

export interface InitDestinations {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: Init<any, any>;
}

export interface Destinations {
  [key: string]: Instance;
}

// Context interfaces for destination functions
export interface Context<Settings = unknown, Mapping = unknown> {
  collector: Collector.Instance;
  config: Config<Settings, Mapping>;
  data?: Data;
  env: Env;
}

export interface PushContext<Settings = unknown, Mapping = unknown>
  extends Context<Settings, Mapping> {
  mapping?: WalkerOSMapping.Rule<Mapping>;
}

export interface PushBatchContext<Settings = unknown, Mapping = unknown>
  extends Context<Settings, Mapping> {
  mapping?: WalkerOSMapping.Rule<Mapping>;
}

// Updated function signatures with context-based parameters
export type InitFn<Settings, Mapping> = (
  context: Context<Settings, Mapping>,
) => WalkerOS.PromiseOrValue<void | false | Config<Settings, Mapping>>;

export type PushFn<Settings, Mapping> = (
  event: WalkerOS.Event,
  context: PushContext<Settings, Mapping>,
) => WalkerOS.PromiseOrValue<void>;

export type PushBatchFn<Settings, Mapping> = (
  batch: Batch<Mapping>,
  context: PushBatchContext<Settings, Mapping>,
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

export type Data =
  | WalkerOS.Property
  | undefined
  | Array<WalkerOS.Property | undefined>;

export type Ref = {
  id: string;
  destination: Instance;
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

/**
 * Base environment requirements interface for walkerOS destinations
 *
 * This defines the core interface that destinations can use to declare
 * their runtime environment requirements. Platform-specific extensions
 * should extend this interface.
 */
export interface Env {
  /**
   * Generic global properties that destinations may require
   * Platform-specific implementations can extend this interface
   */
  [key: string]: unknown;
}
