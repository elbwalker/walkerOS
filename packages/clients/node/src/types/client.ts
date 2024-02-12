import type { WalkerOS, Schema, Handler } from '@elbwalker/types';
import type * as NodeDestination from './destination';

export interface Instance {
  config: Config;
  push: Push;
  setup?: Setup; // @TODO make this required
}

export interface AddDestination {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (id: string, destination: NodeDestination.Destination<any, any>): void;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | NodeDestination.Destination<any, any>
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
  onError?: Handler.Error;
  onLog?: Handler.Log;
}

export interface Destinations {
  [key: string]: NodeDestination.Destination;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrependInstance<Fn extends (...args: any) => any> = (
  instance: Instance,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
