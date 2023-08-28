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
  (event: Elbwalker.Event): Promise<PushResult>;
}

export interface PushResult {
  successful: NodeDestination.PushSuccess;
  failed: NodeDestination.PushFailure;
}

export interface Config {
  version: string;
}

export interface Destinations {
  [key: string]: NodeDestination.Function;
}

// interface ServerEvent extends WebEvent {
//   additional_data: AdditionalData;
// }

// @TODO fix until type update in elbwalker/walker.js
// interface WebEvent extends Omit<Omit<Elbwalker.Event, 'source'>, 'version'> {
//   version: {
//     client: string;
//     server: string;
//   };
//   source: {
//     type: string;
//     id: string;
//     previous_id: string;
//   };
// }

interface AdditionalData extends Elbwalker.Properties {}
