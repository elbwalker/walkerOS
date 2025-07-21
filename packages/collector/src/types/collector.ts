import type { WalkerOS } from '@walkerOS/core';

// Collector-specific types that don't belong in core
export interface RunState {
  consent?: WalkerOS.Consent;
  user?: WalkerOS.User;
  globals?: WalkerOS.Properties;
  custom?: WalkerOS.Properties;
}

export interface CreateCollector {
  collector: WalkerOS.Collector;
  elb: WalkerOS.Elb;
}

export type InitSource = Partial<WalkerOS.CollectorSource>;
