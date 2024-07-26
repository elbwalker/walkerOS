import type { NodeDestination } from '@elbwalker/client-node';
import type { DestinationCoreEtag } from '@elbwalker/destination-core-etag';

export interface Destination
  extends NodeDestination.Destination<CustomConfig, CustomEventConfig> {}

export type Config = NodeDestination.Config<CustomConfig, CustomEventConfig>;

export type PartialConfig = NodeDestination.Config<
  Partial<CustomConfig>,
  Partial<CustomEventConfig>
>;

export interface CustomConfig extends DestinationCoreEtag.Config {}

export interface CustomEventConfig {}

export type PushEvents = NodeDestination.PushEvents<CustomEventConfig>;
