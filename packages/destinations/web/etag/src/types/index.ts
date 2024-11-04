import type { WebDestination } from '@elbwalker/walker.js';
import type { DestinationCoreEtag } from '@elbwalker/destination-core-etag';

export interface Destination
  extends WebDestination.Destination<Custom, CustomEvent> {}

export type Config = WebDestination.Config<Custom, CustomEvent>;

export interface Custom extends DestinationCoreEtag.Config {}

export interface CustomEvent {}
