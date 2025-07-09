import type { Destination as WalkerOSDestination } from '@walkerOS/types';

export interface Destination<Settings = unknown, Mapping = unknown>
  extends WalkerOSDestination.Destination<Settings, Mapping> {}

export type Init = WalkerOSDestination.Init;

export type Config<
  Settings = unknown,
  Mapping = unknown,
> = WalkerOSDestination.Config<Settings, Mapping>;
