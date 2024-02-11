import type { Destination, WalkerOS } from '@elbwalker/types';
import type { WebDestination } from '@elbwalker/walker.js';

export interface Function
  extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
  url: string;
  transform?: Transform;
  transport?: Transport;
}

export interface CustomEventConfig {}

export type Transform = (
  event: WalkerOS.Event,
  config?: Config,
  mapping?: Destination.EventConfig<CustomEventConfig>,
) => XMLHttpRequestBodyInit;

export type Transport = 'fetch' | 'beacon' | 'xhr';
