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
 * Web-specific environment requirements interface
 *
 * Extends the core Env interface with web-specific
 * globals like window and document for browser destinations.
 */
export interface Env extends WalkerOSDestination.BaseEnv {
  /**
   * Properties to be added to the global `window` object
   *
   * Used by web destinations that expect browser-specific
   * global functions like analytics APIs.
   *
   * @example
   * ```typescript
   * window: {
   *   gtag: () => {},
   *   fbq: () => {},
   *   dataLayer: []
   * }
   * ```
   */
  window?: Record<string, unknown>;

  /**
   * Properties to be added to the global `document` object
   *
   * Used by destinations that need DOM manipulation capabilities
   * for script loading or element creation.
   *
   * @example
   * ```typescript
   * document: {
   *   createElement: () => ({ src: '', async: false }),
   *   head: { appendChild: () => {} }
   * }
   * ```
   */
  document?: Record<string, unknown>;
}
