import type { Hooks, Schema, WalkerOS } from '@walkerOS/types';
import type { Fn } from './elb';
import type { Destination } from './destination';

export interface Instance extends WalkerOS.Instance {
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

export type PrependInstance<Fn extends (...args: never) => ReturnType<Fn>> = (
  instance: Instance,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
