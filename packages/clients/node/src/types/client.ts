import type { Elbwalker } from '@elbwalker/types';
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
    nameOrEvent: string | Elbwalker.PartialEvent,
    data?: PushData,
    options?: PushOptions,
  ): Promise<PushResult>;
}

export interface Setup {
  (config: Config): Promise<SetupResult>;
}

export type PushData =
  | Elbwalker.PushData
  | NodeDestination.Function<any, any>
  | NodeDestination.PushResult;

export type PushOptions = Elbwalker.PushOptions | NodeDestination.Config;

export interface PushResult extends NodeDestination.PushResult {
  command?: Command;
  event?: Elbwalker.Event;
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
export interface Config extends Elbwalker.Config {
  client: string;
  destinations: Destinations;
  globalsStatic: Elbwalker.Properties;
  queue: Elbwalker.Events;
  source: Elbwalker.Source;
}

export interface Destinations {
  [key: string]: NodeDestination.Function;
}

export type PrependInstance<Fn extends (...args: any) => any> = (
  instance: Function,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
