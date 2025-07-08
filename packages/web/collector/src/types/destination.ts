import type {
  Destination as WalkerOSDestination,
  Mapping as WalkerOSMapping,
} from '@walkerOS/types';

export interface Destination<Settings = unknown, EventMapping = unknown>
  extends WalkerOSDestination.Destination<Settings, EventMapping> {
  config: Config<Settings, EventMapping>;
  push: WalkerOSDestination.PushFn<Settings, EventMapping>;
  init?: WalkerOSDestination.InitFn<Settings, EventMapping>;
}

export type DestinationInit = WalkerOSDestination.DestinationInit;

export type Config<
  Settings = unknown,
  EventMapping = unknown,
> = WalkerOSDestination.Config<Settings, EventMapping>;

export type Mapping<EventMapping = unknown> =
  WalkerOSMapping.Config<EventMapping>;

export type EventMapping<EventMappingType = unknown> =
  WalkerOSMapping.EventConfig<EventMappingType>;
