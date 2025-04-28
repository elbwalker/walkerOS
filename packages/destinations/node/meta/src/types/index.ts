import type { DestinationNode } from '@elbwalker/source-node';
import type {
  Handler,
  Mapping,
  Destination as WalkerOSDestination,
} from '@elbwalker/types';

export interface Destination
  extends DestinationNode.Destination<Custom, CustomEvent> {
  init: InitFn;
  push: PushFn;
}

export type InitFn = WalkerOSDestination.InitFn<Custom, CustomEvent>;
export type PushFn = WalkerOSDestination.PushFn<Custom, CustomEvent>;

export type Config = {
  custom: Custom;
  onLog: Handler.Log;
} & DestinationNode.Config<Custom, CustomEvent>;

export type EventMapping = DestinationNode.EventMapping<CustomEvent>;

export type PushEvents = DestinationNode.PushEvents<CustomEvent>;

export interface Custom {
  accessToken: string;
  pixelId: string;
  debug?: boolean;
  partner?: string;
  testCode?: string;
}

export interface CustomEvent {
  // Custom destination event mapping properties
  currency?: Mapping.Value;
  content?: {
    id?: Mapping.Value;
    name?: Mapping.Value;
    price?: Mapping.Value;
    quantity?: Mapping.Value;
  };
  value?: Mapping.Value;
}

export type EventConfig = Mapping.EventConfig<CustomEvent>;
