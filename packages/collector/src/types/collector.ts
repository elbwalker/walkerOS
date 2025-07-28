import type { Collector, WalkerOS } from '@walkerOS/core';
import type { InitSources } from '../source';

// Collector-specific types that don't belong in core
export interface RunState {
  consent?: WalkerOS.Consent;
  user?: WalkerOS.User;
  globals?: WalkerOS.Properties;
  custom?: WalkerOS.Properties;
}

export interface CreateCollector {
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}

export type InitSource = Partial<Collector.CollectorSource>;

// Extended config interface that includes sources
export interface CollectorConfig extends Collector.Config {
  sources?: InitSources;
}
