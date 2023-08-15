import { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {}
}

export declare namespace DestinationAPI {
  interface Function
    extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

  type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

  interface CustomConfig {
    url: string;
    transport?: Transport;
  }

  interface CustomEventConfig {}

  type Transport = 'fetch' | 'beacon' | 'xhr';
}
