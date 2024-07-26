import type { WebDestination } from '@elbwalker/walker.js';
import type { DestinationCoreEtag } from '@elbwalker/destination-core-etag';

export interface Destination
  extends WebDestination.Destination<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig extends DestinationCoreEtag.Config {
  pageView?: false | string; // Name of the page view event
  sessionStart?: string; // Name of the session start event
}

export interface CustomEventConfig {}
