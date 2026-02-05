import type { DestinationWeb } from '@walkeros/web-core';

/**
 * Type definitions for a simple destination.
 * Customize Settings for your vendor's requirements.
 */

export interface Settings {
  apiKey?: string;
  // Add vendor-specific settings
}

export interface Config extends DestinationWeb.Config<Settings> {}
export interface Destination extends DestinationWeb.Destination<Config> {}
