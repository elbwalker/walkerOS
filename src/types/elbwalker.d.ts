import { Entities } from './walker';

export interface Elbwalker {
  go: (projectId?: string) => void;
  load: () => void;
  run: () => void;
  push: (
    event: string,
    data?: AnyObject,
    trigger?: string,
    nested?: Entities,
  ) => void;
  destination: (destination: Destination, config?: AnyObject) => void;
  destinations: Destinations;
}

type Events = Event[];
export interface Event {
  entity: string;
  action: string;
  data?: AnyObject;
  trigger?: string;
  nested: Entities;
}

export interface ElbLayer {
  push: (
    event?: string,
    data?: unknown,
    trigger?: string,
    nested?: Entities,
  ) => void;
}

type Destinations = Destination[];
export interface Destination {
  init: (config: AnyObject) => void;
  push: (event: Event) => void;
  mapping: DestinationMapping | false;
}

export interface DestinationMapping {
  [entity: string]: { [action: string]: boolean };
}

export type AnyObject = Record<string, unknown>;
