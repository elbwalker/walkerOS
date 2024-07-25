import type { WalkerOS } from '@elbwalker/types';
import type { WebDestination } from '@elbwalker/walker.js';
import type { DestinationCoreEtag } from '@elbwalker/destination-core-etag';

export interface Destination
  extends WebDestination.Destination<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig extends DestinationCoreEtag.Config {}

export interface CustomEventConfig {}

export interface State {
  count?: number; // Sent events count
  lastEngagement?: number; // Last event timestamp
  isEngaged?: boolean; // If a user is engaged
  sentPageView?: boolean; // If a page view has been sent
  sentSession?: boolean; // If session parameters have been sent
}

export interface Context {
  session?: WalkerOS.SessionData;
  userAgent?: string;
}
