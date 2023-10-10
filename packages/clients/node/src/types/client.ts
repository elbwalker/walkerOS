import type { WalkerOS, Schema } from '@elbwalker/types';
import type * as NodeDestination from './destination';

export interface Function {
  config: Config;
  push: Push;
  setup?: Setup; // @TODO make this required
}

export interface AddDestination {
  (id: string, destination: NodeDestination.Function<any, any>): void;
}

export interface Push {
  (
    nameOrEvent: string | WalkerOS.PartialEvent,
    data?: PushData,
    options?: PushOptions,
  ): Promise<PushResult>;
}

export interface Setup {
  (config: Config): Promise<SetupResult>;
}

export type PushData =
  | WalkerOS.PushData
  | NodeDestination.Function<any, any>
  | NodeDestination.PushResult;

export type PushOptions = WalkerOS.PushOptions | NodeDestination.Config;

export interface PushResult extends NodeDestination.PushResult {
  command?: Command;
  event?: WalkerOS.Event;
  status: Status;
}

export interface SetupResult extends NodeDestination.SetupResult {
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

export type PartialConfig = Partial<Config>;
export interface Config extends WalkerOS.Config {
  client: string;
  destinations: Destinations;
  globalsStatic: WalkerOS.Properties;
  queue: WalkerOS.Events;
  contracts?: Schema.Contracts;
  source: WalkerOS.Source;
}

export interface Destinations {
  [key: string]: NodeDestination.Function;
}

export type PrependInstance<Fn extends (...args: any) => any> = (
  instance: Function,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
