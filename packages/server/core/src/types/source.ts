import type { Source as WalkerOSSource } from '@walkeros/core';

export interface Source<Settings = unknown, Mapping = unknown>
  extends WalkerOSSource.Instance<Settings, Mapping> {}

export type Config<
  Settings = unknown,
  Mapping = unknown,
> = WalkerOSSource.Config<Settings, Mapping>;

export type PartialConfig<
  Settings = unknown,
  Mapping = unknown,
> = WalkerOSSource.PartialConfig<Settings, Mapping>;

export type Init<Settings = unknown, Mapping = unknown> = WalkerOSSource.Init<
  Settings,
  Mapping
>;

export type InitSource<
  Settings = unknown,
  Mapping = unknown,
> = WalkerOSSource.InitSource<Settings, Mapping>;

/**
 * Server-specific environment requirements interface
 *
 * Extends the core Env interface for server-side sources.
 * Used for dependency injection of SDK classes and external APIs.
 */
export interface Env extends WalkerOSSource.Env {
  // Server environments can include SDK constructors, API clients, etc.
  // Each source extends this further with specific requirements
}
