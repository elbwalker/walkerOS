import type { WalkerOS, Schema, Handler, Hooks } from '@elbwalker/types';
import type { SessionData } from '@elbwalker/utils';
import type * as NodeDestination from './destination';
import type * as On from './on';

export interface Instance extends State, WalkerOS.Instance {
  push: Elb<Promise<PushResult>>;
  client: string;
  config: Config;
  destinations: Destinations;
}

export interface State extends WalkerOS.State {
  config: Config;
  destinations: Destinations;
  on: On.Config;
  session: undefined | SessionData;
  timing: number;
}

export interface Config extends WalkerOS.Config {
  contracts?: Schema.Contracts;
  globalsStatic: WalkerOS.Properties;
  sessionStatic: Partial<SessionData>;
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
  (id: string, destination: NodeDestination.Destination): void;
}

export interface Elb<R = Promise<PushResult>> extends WalkerOS.Elb<R> {
  (name: string, data?: PushData, options?: PushOptions): R;
  (event: WalkerOS.PartialEvent, data?: PushData, options?: PushOptions): R;
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

export type PushData =
  | WalkerOS.PushData
  | NodeDestination.Destination
  | Partial<State>;

export type PushOptions = WalkerOS.PushOptions | NodeDestination.Config;

export interface PushResult extends NodeDestination.PushResult {
  event?: WalkerOS.Event;
  status: Status;
}

export interface Command {
  name: string;
  data: unknown;
}

export interface Status {
  ok: boolean;
  error?: string;
}

export interface Destinations {
  [key: string]: NodeDestination.Destination;
}

export type PrependInstance<Fn extends (...args: never) => ReturnType<Fn>> = (
  instance: Instance,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
