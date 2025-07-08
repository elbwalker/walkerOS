import type { Handler, Mapping, On, WalkerOS } from '.';

export interface Destination<Settings = unknown, EventMapping = unknown> {
  config: Config<Settings, EventMapping>; // Configuration settings for the destination
  queue?: WalkerOS.Events; // Non processed events yet and reset with each new run
  dlq?: DLQ; // Failed events
  type?: string; // The type of the destination
  init?: InitFn<Settings, EventMapping>;
  push: PushFn<Settings, EventMapping>;
  pushBatch?: PushBatchFn<Settings, EventMapping>;
}

export interface Config<Settings = unknown, EventMapping = unknown> {
  consent?: WalkerOS.Consent; // Required consent states to init and push events
  settings?: Settings; // Destination-specific configuration settings
  data?: Mapping.Value | Mapping.Values; // Mapping of event data
  id?: string; // A unique key for the destination
  init?: boolean; // If the destination has been initialized by calling the init method
  loadScript?: boolean; // If an additional script to work should be loaded
  mapping?: Mapping.Config<EventMapping>; // A map to handle events individually
  on?: On.Config; // On events listener rules
  policy?: Policy; // Rules for processing events
  queue?: boolean; // Disable processing of previously pushed events
  verbose?: boolean; // Enable verbose logging
  fn?: (...args: unknown[]) => unknown; // Custom function to be called
  onError?: Handler.Error; // Custom error handler
  onLog?: Handler.Log; // Custom log handler
}

export type PartialConfig<Settings = unknown, EventMapping = unknown> = Config<
  Partial<Settings> | Settings,
  Partial<EventMapping> | EventMapping
>;

export interface Policy {
  [key: string]: Mapping.Value;
}

export type DestinationInit = Partial<Omit<Destination, 'push'>> &
  Pick<Destination, 'push'>;

export type InitFn<Settings, EventMapping> = (
  config?: PartialConfig<Settings, EventMapping>,
  instance?: WalkerOS.Instance,
) => WalkerOS.PromiseOrValue<void | false | Config<Settings, EventMapping>>;

export type PushFn<Settings, EventMapping> = (
  event: WalkerOS.Event,
  config: Config<Settings, EventMapping>,
  mapping?: Mapping.EventConfig<EventMapping>,
  options?: Options,
) => WalkerOS.PromiseOrValue<void>;

export type PushBatchFn<Settings, EventMapping> = (
  batch: Batch<EventMapping>,
  config: Config<Settings, EventMapping>,
  options?: Options,
) => void;

export type PushEvent<EventMapping = unknown> = {
  event: WalkerOS.Event;
  mapping?: Mapping.EventConfig<EventMapping>;
};
export type PushEvents<EventMapping = unknown> = Array<PushEvent<EventMapping>>;

export interface Batch<EventMapping> {
  key: string;
  events: WalkerOS.Events;
  data: Array<Data>;
  mapping?: Mapping.EventConfig<EventMapping>;
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
