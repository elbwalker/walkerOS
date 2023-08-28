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
  (event: Elbwalker.Event): Promise<NodeDestination.PushResult>;
}

export interface Config extends Elbwalker.Config {
  destinations: Destinations;
  queue: Elbwalker.Events;
}

export interface Destinations {
  [key: string]: NodeDestination.Function;
}
