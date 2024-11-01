import type { NodeDestination } from '@elbwalker/client-node';
import type { DestinationCoreEtag } from '@elbwalker/destination-core-etag';

export interface Destination
  extends NodeDestination.Destination<Custom, CustomEvent> {}

export type Config = NodeDestination.Config<Custom, CustomEvent>;

export type PartialConfig = NodeDestination.Config<
  Partial<Custom>,
  Partial<CustomEvent>
>;

export type PushFn = NodeDestination.PushFn<Custom, CustomEvent>;

export interface Custom extends DestinationCoreEtag.Config {}

export interface CustomEvent {}

export type PushEvents = NodeDestination.PushEvents<CustomEvent>;
