import type { WalkerOS, Destination, Elb } from '@walkerOS/core';
import type { Source } from './source';

export interface InitConfig extends Partial<WalkerOS.Config> {
  sources?: Source[];
  destinations?: Destination.InitDestinations;
  consent?: WalkerOS.Consent;
  user?: WalkerOS.User;
  globals?: WalkerOS.Properties;
  custom?: WalkerOS.Properties;
}

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
