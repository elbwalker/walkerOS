import type { DestinationNode } from '@elbwalker/source-node';
import type { DestinationCoreEtag } from '@elbwalker/destination-core-etag';
import type { Destination as WalkerOSDestination } from '@elbwalker/types';

export interface Destination
  extends DestinationNode.Destination<Custom, CustomEvent> {}

export type Config = DestinationNode.Config<Custom, CustomEvent>;

export type PartialConfig = DestinationNode.Config<
  Partial<Custom>,
  Partial<CustomEvent>
>;

export type PushFn = WalkerOSDestination.PushFn<Custom, CustomEvent>;

export interface Custom extends DestinationCoreEtag.Config {}

export interface CustomEvent {}

export type PushEvents = DestinationNode.PushEvents<CustomEvent>;
