import type { NodeDestination } from '@elbwalker/client-node';
import type { Handler, WalkerOS } from '@elbwalker/types';

export interface Destination
  extends NodeDestination.Destination<CustomConfig, CustomEventConfig> {
  init: InitFn;
}

export type PushFn = NodeDestination.PushFn<CustomConfig, CustomEventConfig>;
export type InitFn = (config: PartialConfig) => Promise<false | Config>;

export type Config = {
  custom: CustomConfig;
  onLog: Handler.Log;
} & NodeDestination.Config<CustomConfig, CustomEventConfig>;
export type PartialConfig = NodeDestination.Config<
  Partial<CustomConfig>,
  Partial<CustomEventConfig>
>;

export type Mapping = NodeDestination.EventConfig<CustomEventConfig>;

export type PushEvents = NodeDestination.PushEvents<CustomEventConfig>;

export interface CustomConfig {
  access_token: string;
  pixel_id: string;
  debug?: boolean;
  partner?: string;
  test_code?: string;
}

export interface CustomEventConfig {
  // Custom destination event mapping properties
  currency?: WalkerOS.MappingValue;
  content?: {
    id?: WalkerOS.MappingValue;
    price?: WalkerOS.MappingValue;
    quantity?: WalkerOS.MappingValue;
  };
  value?: WalkerOS.MappingValue;
}
