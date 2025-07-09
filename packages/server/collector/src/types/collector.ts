import type { Hooks, Schema, WalkerOS } from '@walkerOS/core';
import type { Fn } from './elb';
import type { Destination } from './destination';

export interface Collector extends WalkerOS.Collector {
  config: Config;
  destinations: Destinations;
  push: Fn;
}

export interface State extends WalkerOS.State {
  config: Config;
  destinations: Destinations;
}

export interface Config extends WalkerOS.Config {
  contracts?: Schema.Contracts;
}
export type PartialConfig = Partial<Config>;

export interface InitConfig extends Partial<Config> {
  consent?: WalkerOS.Consent;
  custom?: WalkerOS.Properties;
  destinations?: Destinations;
  hooks?: Hooks.Functions;
  on?: WalkerOS.OnConfig;
  tagging?: number;
  user?: WalkerOS.User;
}

export interface Command {
  name: string;
  data: unknown;
}

export interface Destinations {
  [key: string]: Destination;
}

export type PrependCollector<Fn extends (...args: never) => ReturnType<Fn>> = (
  collector: Collector,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
