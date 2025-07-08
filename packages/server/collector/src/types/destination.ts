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

export type DestinationInit = Partial<Omit<Destination, 'push'>> &
  Pick<Destination, 'push'>;

export type Config<
  Settings = unknown,
  EventMapping = unknown,
> = WalkerOSDestination.Config<Settings, EventMapping>;

export type Mapping<EventMapping> = WalkerOSMapping.Config<EventMapping>;

export type EventMapping<EventMappingType = unknown> =
  WalkerOSMapping.EventConfig<EventMappingType>;

export type PushEvent<EventMapping = unknown> =
  WalkerOSDestination.PushEvent<EventMapping>;

export type PushEvents<EventMapping = unknown> =
  WalkerOSDestination.PushEvents<EventMapping>;
