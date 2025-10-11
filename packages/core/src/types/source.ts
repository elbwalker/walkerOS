import type {
  WalkerOS,
  Elb,
  On,
  Handler,
  Mapping as WalkerOSMapping,
} from './index';

export interface Config<Settings = unknown, Mapping = unknown, E = Env> {
  // consent?: WalkerOS.Consent; // Required consent states to init and push events
  settings?: Settings; // Source-specific configuration settings
  // data?: WalkerOSMapping.Value | WalkerOSMapping.Values; // Mapping of event data
  env?: E; // Env override for testing/simulation
  id?: string; // A unique key for the source
  // init?: boolean; // If the source has been initialized by calling the init method
  // loadScript?: boolean; // If an additional script to work should be loaded
  // mapping?: WalkerOSMapping.Rules<WalkerOSMapping.Rule<Mapping>>; // A map to handle events individually
  // policy?: Policy; // Rules for processing events
  // queue?: boolean; // Enable event queuing
  // verbose?: boolean; // Enable verbose logging
  onError?: Handler.Error; // Custom error handler
  // onLog?: Handler.Log; // Custom log handler
  disabled?: boolean; // Disable the source
  primary?: boolean; // Internal flag set by collector when source is marked as primary
}

export type PartialConfig<
  Settings = unknown,
  Mapping = unknown,
  E = Env,
> = Config<Partial<Settings> | Settings, Partial<Mapping> | Mapping, E>;

export interface Policy {
  [key: string]: WalkerOSMapping.Value;
}

/**
 * Env interface for dependency injection into sources.
 *
 * Sources receive all their dependencies through this environment object,
 * making them platform-agnostic and easily testable.
 */
export interface Env {
  elb: Elb.Fn; // Collector ingest function - sources push events via this
  [key: string]: unknown; // Platform-specific APIs (window, document, etc.)
}

/**
 * Source instance returned by Source.Init function.
 *
 * Sources are stateless and contain no collector references.
 * All communication with collector happens via env.elb function.
 */
export interface Instance<
  Settings = unknown,
  Mapping = unknown,
  Push extends Elb.Fn = Elb.Fn,
  E = Env,
> {
  type: string;
  config: Config<Settings, Mapping, E>;
  push: Push; // Required - each source must provide its own push method
  destroy?(): void | Promise<void>;
  on?(event: On.Types, context?: unknown): void | Promise<void>;
}

/**
 * Source initialization function signature.
 *
 * Sources are functions that receive configuration and environment dependencies
 * and return a stateless instance.
 *
 * @param config - Source configuration (settings, type, etc.)
 * @param env - Env with elb function and platform APIs
 * @returns Source instance or promise of instance
 */
export type Init<
  Settings = unknown,
  Mapping = unknown,
  Push extends Elb.Fn = Elb.Fn,
  E = Env,
> = (
  config: Partial<Config<Settings, Mapping, E>>,
  env: E,
) =>
  | Instance<Settings, Mapping, Push, E>
  | Promise<Instance<Settings, Mapping, Push, E>>;

/**
 * Source configuration interface for collector initialization.
 * Similar to destinations, this defines the structure for source definitions.
 */
export type InitSource<
  Settings = unknown,
  Mapping = unknown,
  Push extends Elb.Fn = Elb.Fn,
  E = Env,
> = {
  code: Init<Settings, Mapping, Push, E>;
  config?: Partial<Config<Settings, Mapping, E>>;
  env?: Partial<E>;
  primary?: boolean; // Mark this source as the primary elb entry point
};

/**
 * Sources configuration for collector.
 * Maps source IDs to their initialization configurations.
 */
export interface InitSources {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [sourceId: string]: InitSource<any, any, Elb.Fn, any>;
}
