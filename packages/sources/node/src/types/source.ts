import type { WalkerOS, Schema, Handler, Hooks } from '@elbwalker/types';
import type { DestinationNode, Elb, On } from '.';

export interface Instance extends State, WalkerOS.Instance {
  config: Config;
  destinations: Destinations;
  version: string;
  push: Elb.Fn;
}

export interface State extends WalkerOS.State {
  config: Config;
  destinations: Destinations;
  on: On.Config;
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
  on?: On.Config;
  tagging?: number;
  user?: WalkerOS.User;
}

export interface AddDestination {
  (id: string, destination: DestinationNode.Destination): void;
}

export type HandleCommand = (
  instance: Instance,
  action: string,
  data?: Elb.PushData,
  options?: Elb.PushOptions,
) => Promise<Elb.PushResult>;

export type HandleEvent = (
  instance: Instance,
  event: WalkerOS.Event,
) => Promise<Elb.PushResult>;

export interface Command {
  name: string;
  data: unknown;
}

export interface Status {
  ok: boolean;
  error?: string;
}

export interface Destinations {
  [key: string]: DestinationNode.Destination;
}

export type PrependInstance<Fn extends (...args: never) => ReturnType<Fn>> = (
  instance: Instance,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
