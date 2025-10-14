import type { Collector, WalkerOS } from '@walkeros/core';

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

export interface StartFlow<ElbPush extends WalkerOS.Elb = WalkerOS.Elb> {
  collector: Collector.Instance;
  elb: ElbPush;
}
