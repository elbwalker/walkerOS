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
    data?: Elbwalker.PushData,
  ): Promise<PushResult>;
}

export interface PushResult extends NodeDestination.PushResult {
  status: Status;
}

export interface Status {
  ok: boolean;
  error?: unknown;
}

export interface Config extends Elbwalker.Config {
  client: string;
  destinations: Destinations;
  queue: Elbwalker.Events;
  // @TODO onError? (error: Error): void; // Custom error handler
}

export interface Destinations {
  [key: string]: NodeDestination.Function;
}

export type PrependInstance<Fn extends (...args: any) => any> = (
  instance: Function,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
