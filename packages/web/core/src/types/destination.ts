import type { Destination as WalkerOSDestination } from '@walkeros/core';

export interface Destination<Settings = unknown, Mapping = unknown>
  extends WalkerOSDestination.Instance<Settings, Mapping> {}

export type Init = WalkerOSDestination.Init;

export type Config<
  Settings = unknown,
  Mapping = unknown,
> = WalkerOSDestination.Config<Settings, Mapping>;

export type PartialConfig<
  Settings = unknown,
  Mapping = unknown,
> = WalkerOSDestination.PartialConfig<Settings, Mapping>;

export type InitFn<
  Settings = unknown,
  Mapping = unknown,
> = WalkerOSDestination.InitFn<Settings, Mapping>;

export type PushFn<
  Settings = unknown,
  Mapping = unknown,
> = WalkerOSDestination.PushFn<Settings, Mapping>;

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
export interface Env extends WalkerOSDestination.Env {
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
