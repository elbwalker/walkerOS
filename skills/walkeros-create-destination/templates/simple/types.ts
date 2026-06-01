import type { WalkerOS, Destination as CoreDestination } from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

/**
 * Type definitions for a simple destination.
 * Customize Settings for your vendor's requirements.
 */

/**
 * Declare the vendor SDK on `Window` as OPTIONAL via `declare global`.
 * This makes `window.vendorSdk` typed and cast-free at the access site.
 * Only declare the methods this destination actually calls.
 */
declare global {
  interface Window {
    vendorSdk?: VendorSdk;
  }
}

export interface VendorSdk {
  (method: string, name: string, params?: WalkerOS.AnyObject): void;
}

export interface Settings {
  apiKey?: string;
  // Add vendor-specific settings
}

export type InitSettings = Partial<Settings>;

export interface Mapping {}

/**
 * Narrow the destination Env so `env.window?.vendorSdk` is typed concretely.
 * Extending `DestinationWeb.Env` keeps the rest of the env contract intact and
 * threads this concrete type through the init/push context (see Types below).
 */
export interface Env extends DestinationWeb.Env {
  window?: {
    vendorSdk?: VendorSdk;
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;
