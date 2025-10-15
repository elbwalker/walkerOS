import type { Collector, WalkerOS, Elb } from '@walkeros/core';

// Collector-specific types that don't belong in core
export interface RunState {
  consent?: WalkerOS.Consent;
  user?: WalkerOS.User;
  globals?: WalkerOS.Properties;
  custom?: WalkerOS.Properties;
}

export type HandleCommandFn<T extends Collector.Instance> = (
  collector: T,
  action: string,
  data?: unknown,
  options?: unknown,
) => Promise<Elb.PushResult>;

export type CommandTypes =
  | 'Action'
  | 'Actions'
  | 'Config'
  | 'Consent'
  | 'Context'
  | 'Custom'
  | 'Destination'
  | 'Elb'
  | 'Globals'
  | 'Hook'
  | 'Init'
  | 'Link'
  | 'On'
  | 'Prefix'
  | 'Ready'
  | 'Run'
  | 'Session'
  | 'User'
  | 'Walker';

export type StorageType = 'cookie' | 'local' | 'session';

export interface CreateCollector {
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}

export interface StartFlow<ElbPush extends WalkerOS.Elb = WalkerOS.Elb> {
  collector: Collector.Instance;
  elb: ElbPush;
}
