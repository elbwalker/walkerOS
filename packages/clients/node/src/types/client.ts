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
  ): Promise<NodeDestination.PushResult>;
}

export interface Config extends Elbwalker.Config {
  destinations: Destinations;
  queue: Elbwalker.Events;
  // @TODO onError? (error: Error): void; // Custom error handler
}

export interface Destinations {
  [key: string]: NodeDestination.Function;
}

export type PrependInstance<Fn extends (...args: any) => any> = (
  instance: Function,
  ...rest: Parameters<Fn>
) => ReturnType<Fn>;
