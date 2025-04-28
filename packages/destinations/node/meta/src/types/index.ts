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

export interface CustomEvent {}

export type EventConfig = Mapping.EventConfig<CustomEvent>;
