import type { WalkerOS, Schema, Handler, Hooks } from '@elbwalker/types';
import type { Fn, PushData, PushOptions, PushResult } from './elb';
import type { Destination } from './destination';
import type { Config as OnConfig } from './on';

export interface Instance extends State, WalkerOS.Instance {
  config: Config;
  destinations: Destinations;
  version: string;
  push: Fn;
}

export interface State extends WalkerOS.State {
  config: Config;
  destinations: Destinations;
  on: OnConfig;
  session: undefined | WalkerOS.SessionData;
  timing: number;
}

export interface Config extends WalkerOS.Config {
  contracts?: Schema.Contracts;
  globalsStatic: WalkerOS.Properties;
  sessionStatic: Partial<WalkerOS.SessionData>;
  onError?: Handler.Error;
  onLog?: Handler.Log;
}
export type PartialConfig = Partial<Config>;

export interface InitConfig extends Partial<Config> {
  consent?: WalkerOS.Consent;
  custom?: WalkerOS.Properties;
  destinations?: Destinations;
  hooks?: Hooks.Functions;
  on?: Config;
  tagging?: number;
  user?: WalkerOS.User;
}

export interface AddDestination {
  (id: string, destination: Destination): void;
}

export type HandleCommand = (
  instance: Instance,
  action: string,
  data?: PushData,
  options?: PushOptions,
) => Promise<PushResult>;

export type HandleEvent = (
  instance: Instance,
  event: WalkerOS.Event,
) => Promise<PushResult>;

export interface Command {
  name: string;
  data: unknown;
}

export interface Status {
  ok: boolean;
  error?: string;
}

export interface Destinations {
  [key: string]: Destination;
}

export type PrependInstance<Fn extends (...args: never) => ReturnType<Fn>> = (
  instance: Instance,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
