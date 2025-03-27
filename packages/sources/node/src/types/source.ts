import type { Elb, Hooks, Schema, WalkerOS } from '@elbwalker/types';
import type { Fn, PushData, PushOptions } from './elb';
import type { Destination } from './destination';

export interface Instance extends WalkerOS.Instance {
  config: Config;
  destinations: Destinations;
  version: string;
  push: Fn;
}

export interface State extends WalkerOS.State {
  config: Config;
  destinations: Destinations;
}

export interface Config extends WalkerOS.Config {
  contracts?: Schema.Contracts;
  globalsStatic: WalkerOS.Properties;
  sessionStatic: Partial<WalkerOS.SessionData>;
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

export type HandleCommand = (
  instance: Instance,
  action: string,
  data?: PushData,
  options?: PushOptions,
) => Promise<Elb.PushResult>;

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
