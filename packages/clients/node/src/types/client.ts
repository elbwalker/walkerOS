import type { Elbwalker } from '@elbwalker/types';
import type { NodeDestination } from '.';

export interface Function {
  addDestination: AddDestination;
  push: Push;
  config: Config;
  destinations: Destinations;
}

export interface AddDestination {
  (id: string, destination: NodeDestination.Function<any, any>): void;
}

export interface Push {
  (event: Elbwalker.Event): Promise<NodeDestination.PushResult>;
}

export interface Config {
  version: string;
}

export interface Destinations {
  [key: string]: NodeDestination.Function;
}
