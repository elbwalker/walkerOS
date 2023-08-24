import type { WebDestination } from '@elbwalker/types';

export interface Function
  extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
  url: string;
  transport?: Transport;
}

export interface CustomEventConfig {}

export type Transport = 'fetch' | 'beacon' | 'xhr';
