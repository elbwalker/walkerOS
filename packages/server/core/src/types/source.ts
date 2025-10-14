/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Source as WalkerOSSource } from '@walkeros/core';

export type TypesGeneric = WalkerOSSource.TypesGeneric;

export interface Source<T extends TypesGeneric = WalkerOSSource.Types>
  extends WalkerOSSource.Instance<T> {}

export type Config<T extends TypesGeneric = WalkerOSSource.Types> =
  WalkerOSSource.Config<T>;

export type PartialConfig<T extends TypesGeneric = WalkerOSSource.Types> =
  WalkerOSSource.PartialConfig<T>;

export type Init<T extends TypesGeneric = WalkerOSSource.Types> =
  WalkerOSSource.Init<T>;

export type InitSource<T extends TypesGeneric = WalkerOSSource.Types> =
  WalkerOSSource.InitSource<T>;

/**
 * Server-specific environment requirements interface
 *
 * Extends the core BaseEnv interface for server-side sources.
 * Used for dependency injection of SDK classes and external APIs.
 */
export interface Env extends WalkerOSSource.BaseEnv {
  // Server environments can include SDK constructors, API clients, etc.
  // Each source extends this further with specific requirements
}
