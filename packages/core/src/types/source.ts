import type { WalkerOS, Elb, On } from './index';

export interface Config {
  id?: string;
  disabled?: boolean;
  settings: WalkerOS.AnyObject;
  onError?: WalkerOS.AnyFunction;
  // Future expansion like destinations:
  // mapping?: MappingRules;
  // consent?: Consent;
  // policy?: Policy;
}

export type InitConfig = Partial<Config>;

/**
 * Environment interface for dependency injection into sources.
 *
 * Sources receive all their dependencies through this environment object,
 * making them platform-agnostic and easily testable.
 */
export interface Environment {
  elb: Elb.Fn; // Collector ingest function - sources push events via this
  [key: string]: unknown; // Platform-specific APIs (window, document, etc.)
}

/**
 * Source instance returned by Source.Init function.
 *
 * Sources are stateless and contain no collector references.
 * All communication with collector happens via env.elb function.
 */
export interface Instance<T extends Config = Config> {
  type: string;
  config: T;
  push: Elb.Fn; // Required - each source must provide its own push method
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
 * @param env - Environment with elb function and platform APIs (defaults to {})
 * @returns Source instance or promise of instance
 */
export type Init<T extends Config = Config> = (
  config: Partial<T>,
  env?: Environment,
) => Instance<T> | Promise<Instance<T>>;

/**
 * Source configuration interface for collector initialization.
 * Similar to destinations, this defines the structure for source definitions.
 */
export type InitSource<T extends Config = Config> = {
  code: Init<T>;
  config?: T;
  env?: Partial<Environment>;
};

/**
 * Sources configuration for collector.
 * Maps source IDs to their initialization configurations.
 */
export interface InitSources {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [sourceId: string]: InitSource<any>;
}
