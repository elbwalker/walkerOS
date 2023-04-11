import { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    _paq?: Array<unknown>;
  }
}

export declare namespace DestinationPiwikPro {
  interface Function
    extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

  type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

  interface CustomConfig {
    appId: string;
    // dimensions?: Dimensions;
    linkTracking?: boolean;
    pageview?: boolean;
    url: string;
  }

  interface CustomEventConfig {
    // dimensions?: Dimensions;
    goalId?: string;
    goalValue?: string;
    name?: string;
    value?: string;
  }

  interface Dimensions {
    [i: number]: string;
  }
}
