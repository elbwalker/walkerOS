import type { DestinationWeb } from '@elbwalker/walker.js';
import type { DestinationCoreEtag } from '@elbwalker/destination-core-etag';

export interface Destination
  extends DestinationWeb.Destination<Custom, CustomEvent> {}

export type Config = DestinationWeb.Config<Custom, CustomEvent>;

export interface Custom extends DestinationCoreEtag.Config {}

export interface CustomEvent {}
