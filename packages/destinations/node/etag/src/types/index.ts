import type { DestinationNode } from '@elbwalker/source-node';
import type { DestinationCoreEtag } from '@elbwalker/destination-core-etag';
import type { Destination as WalkerOSDestination } from '@elbwalker/types';

export interface Destination
  extends DestinationNode.Destination<Custom, CustomEvent> {}

export interface Destination
  extends DestinationNode.Destination<Custom, CustomEvent> {
  init: InitFn;
  push: PushFn;
}

export type InitFn = WalkerOSDestination.InitFn<Custom, CustomEvent>;
export type PushFn = WalkerOSDestination.PushFn<Custom, CustomEvent>;

export type Config = DestinationNode.Config<Custom, CustomEvent>;

export interface Custom extends DestinationCoreEtag.Config {}

export interface CustomEvent {}

export type PushEvents = DestinationNode.PushEvents<CustomEvent>;
