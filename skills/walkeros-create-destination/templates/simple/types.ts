import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

/**
 * Declare the vendor's SDK global so `window.vendorSdk` is typed everywhere
 * without casting. Mirror your vendor's real call signature.
 */
declare global {
  interface Window {
    vendorSdk?: VendorSdk & { q?: IArguments[] };
  }
}

export type VendorSdk = (method: string, ...args: unknown[]) => void;

/**
 * Type definitions for a simple destination.
 * Customize Settings for your vendor's requirements.
 */
export interface Settings {
  apiKey?: string;
  // Add vendor-specific settings
}

// InitSettings: user input (all optional)
export type InitSettings = Partial<Settings>;

export interface Mapping {}

/**
 * Narrow the destination's environment to the globals it touches. The SDK
 * global is optional because `init` installs it when missing. Because
 * `getEnv<Env>(env)` returns this narrowed shape intersected with the DOM
 * globals, no `window`/`document` cast is ever needed in index.ts.
 */
export interface Env extends DestinationWeb.Env {
  window: {
    vendorSdk?: VendorSdk & { q?: IArguments[] };
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
