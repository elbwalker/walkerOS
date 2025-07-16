import type { Mapping, WalkerOS } from '@walkerOS/core';

// Re-export the collector source types from core
export type Source = WalkerOS.CollectorSource;
export type SourceConfig = WalkerOS.CollectorSourceConfig;

export interface SourceInitConfig {
  mapping?: Mapping.Rules;
  settings: Record<string, unknown>;
}
