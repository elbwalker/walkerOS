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

export type DestinationInit = WalkerOSDestination.DestinationInit;

export type Config<
  Settings = unknown,
  Mapping = unknown,
> = WalkerOSDestination.Config<Settings, Mapping>;

export type MappingRule = WalkerOSMapping.Rule;
export type MappingRules = WalkerOSMapping.Rules;
