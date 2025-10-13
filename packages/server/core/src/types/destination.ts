/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Destination as WalkerOSDestination } from '@walkeros/core';

export type TypesGeneric = WalkerOSDestination.TypesGeneric;

export interface Destination<T extends TypesGeneric = WalkerOSDestination.Types>
  extends WalkerOSDestination.Instance<T> {}

export type Init = WalkerOSDestination.Init;

export type Config<T extends TypesGeneric = WalkerOSDestination.Types> =
  WalkerOSDestination.Config<T>;

export type PartialConfig<T extends TypesGeneric = WalkerOSDestination.Types> =
  WalkerOSDestination.PartialConfig<T>;

export type InitFn<T extends TypesGeneric = WalkerOSDestination.Types> =
  WalkerOSDestination.InitFn<T>;

export type PushFn<T extends TypesGeneric = WalkerOSDestination.Types> =
  WalkerOSDestination.PushFn<T>;

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
