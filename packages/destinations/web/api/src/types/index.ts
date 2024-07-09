import type { WalkerOS } from '@elbwalker/types';
import type { SendDataValue, SendWebTransport } from '@elbwalker/utils';
import type { WebDestination } from '@elbwalker/walker.js';

export interface Destination
  extends WebDestination.Destination<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
  url: string;
  transform?: Transform;
  transport?: SendWebTransport;
}

export interface CustomEventConfig {}

export type Transform = (
  event: WalkerOS.Event,
  config?: Config,
  mapping?: WebDestination.EventConfig<CustomEventConfig>,
) => SendDataValue;
