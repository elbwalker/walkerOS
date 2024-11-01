import type { NodeDestination } from '@elbwalker/client-node';
import type { Handler, Mapping } from '@elbwalker/types';

export interface Destination
  extends NodeDestination.Destination<CustomConfig, CustomEventConfig> {
  init: InitFn;
}

export type PushFn = NodeDestination.PushFn<CustomConfig, CustomEventConfig>;
export type InitFn = NodeDestination.InitFn<PartialConfig, Config>;

export type Config = {
  custom: CustomConfig;
  onLog: Handler.Log;
} & NodeDestination.Config<CustomConfig, CustomEventConfig>;

export type PartialConfig = NodeDestination.Config<
  Partial<CustomConfig>,
  Partial<CustomEventConfig>
>;

export type EventConfig = NodeDestination.EventConfig<CustomEventConfig>;

export type PushEvents = NodeDestination.PushEvents<CustomEventConfig>;

export interface CustomConfig {
  accessToken: string;
  pixelId: string;
  debug?: boolean;
  partner?: string;
  testCode?: string;
}

export interface CustomEventConfig {
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
