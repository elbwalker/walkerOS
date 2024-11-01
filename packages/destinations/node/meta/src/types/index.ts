import type { NodeDestination } from '@elbwalker/client-node';
import type { Handler, Mapping } from '@elbwalker/types';

export interface Destination
  extends NodeDestination.Destination<Custom, CustomEvent> {
  init: InitFn;
}

export type PushFn = NodeDestination.PushFn<Custom, CustomEvent>;
export type InitFn = NodeDestination.InitFn<PartialConfig, Config>;

export type Config = {
  custom: Custom;
  onLog: Handler.Log;
} & NodeDestination.Config<Custom, CustomEvent>;

export type PartialConfig = NodeDestination.Config<
  Partial<Custom>,
  Partial<CustomEvent>
>;

export type EventConfig = NodeDestination.EventConfig<CustomEvent>;

export type PushEvents = NodeDestination.PushEvents<CustomEvent>;

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
