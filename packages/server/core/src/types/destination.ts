import type { Destination as WalkerOSDestination } from '@walkeros/core';

export interface Destination<
  Settings = unknown,
  Mapping = unknown,
  Environment = Env,
> extends WalkerOSDestination.Instance<Settings, Mapping, Environment> {}

export type Init = WalkerOSDestination.Init;

export type Config<
  Settings = unknown,
  Mapping = unknown,
  Environment = Env,
> = WalkerOSDestination.Config<Settings, Mapping, Environment>;

export type PartialConfig<
  Settings = unknown,
  Mapping = unknown,
  Environment = Env,
> = WalkerOSDestination.PartialConfig<Settings, Mapping, Environment>;

export type InitFn<
  Settings = unknown,
  Mapping = unknown,
  Environment = Env,
> = WalkerOSDestination.InitFn<Settings, Mapping, Environment>;

export type PushFn<
  Settings = unknown,
  Mapping = unknown,
  Environment = Env,
> = WalkerOSDestination.PushFn<Settings, Mapping, Environment>;

export type PushEvent<Mapping = unknown> =
  WalkerOSDestination.PushEvent<Mapping>;

export type PushEvents<Mapping = unknown> =
  WalkerOSDestination.PushEvents<Mapping>;

/**
 * Server-specific environment requirements interface
 *
 * Extends the core Env interface for server-side destinations.
 * Used for dependency injection of SDK classes and external APIs.
 */
export interface Env extends WalkerOSDestination.Env {
  // Server environments can include SDK constructors, API clients, etc.
  // Each destination extends this further with specific requirements
}
