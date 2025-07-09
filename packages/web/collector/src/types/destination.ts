import type {
  Destination as WalkerOSDestination,
  Mapping as WalkerOSMapping,
} from '@walkerOS/types';

export interface Destination<Settings = unknown, Mapping = unknown>
  extends WalkerOSDestination.Destination<Settings, Mapping> {}

export type DestinationInit = WalkerOSDestination.DestinationInit;

export type Config<
  Settings = unknown,
  Mapping = unknown,
> = WalkerOSDestination.Config<Settings, Mapping>;
