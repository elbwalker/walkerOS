import type { Collector } from '.';

/**
 * Flow configuration interface for dynamic walkerOS setup
 * Used by bundlers and other tools to configure walkerOS dynamically
 */
export interface Config {
  /** Collector configuration - uses existing Collector.Config from core */
  collector: Collector.Config;

  /** NPM packages required for this configuration */
  packages: Record<string, string>;
}
