import type {
  Destination as WalkerOSDestination,
  Mapping as WalkerOSMapping,
} from '@walkerOS/types';

export interface Destination<Settings = unknown, Mapping = unknown>
  extends WalkerOSDestination.Destination<Settings, Mapping> {
  config: Config<Settings, Mapping>;
  push: WalkerOSDestination.PushFn<Settings, Mapping>;
  init?: WalkerOSDestination.InitFn<Settings, Mapping>;
}

export type DestinationInit = Partial<Omit<Destination, 'push'>> &
  Pick<Destination, 'push'>;

export type Config<
  Settings = unknown,
  Mapping = unknown,
> = WalkerOSDestination.Config<Settings, Mapping>;

export type MappingRules<Mapping> = WalkerOSMapping.Rules<Mapping>;

export type MappingRule<T = unknown> = WalkerOSMapping.Rule<T>;

export type PushEvent<Mapping = unknown> =
  WalkerOSDestination.PushEvent<Mapping>;

export type PushEvents<Mapping = unknown> =
  WalkerOSDestination.PushEvents<Mapping>;
