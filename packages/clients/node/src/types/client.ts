import type { Elbwalker } from '@elbwalker/types';
import type { NodeDestination } from '.';

export interface Function {
  addDestination: AddDestination;
  push: Push;
  config: Config;
}

export interface AddDestination {
  (id: string, destination: NodeDestination.Function<any, any>): void;
}

export interface Push {
  (
    nameOrEvent: string | Partial<Elbwalker.Event>,
    data?: PushData,
  ): Promise<PushResult>;
}

export type PushData =
  | Elbwalker.PushData
  | NodeDestination.Function
  | NodeDestination.PushResult;

export interface PushResult extends NodeDestination.PushResult {
  command?: Command;
  event?: Elbwalker.Event;
  status: Status;
}

export interface Command {
  name: string;
  data: unknown;
}

export interface Status {
  ok: boolean;
  error?: unknown;
}

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
