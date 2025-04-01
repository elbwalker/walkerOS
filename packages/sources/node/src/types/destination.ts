import type {
  Destination as WalkerOSDestination,
  Mapping as WalkerOSMapping,
} from '@elbwalker/types';

export interface Destination<Custom = unknown, CustomEvent = unknown>
  extends WalkerOSDestination.Destination<Custom, CustomEvent> {
  config: Config<Custom, CustomEvent>;
  push: WalkerOSDestination.PushFn<Custom, CustomEvent>;
  init?: WalkerOSDestination.InitFn<Custom, CustomEvent>;
}

export type DestinationInit = Partial<Omit<Destination, 'push'>> &
  Pick<Destination, 'push'>;

export interface Config<Custom = unknown, CustomEvent = unknown>
  extends WalkerOSDestination.Config<Custom, CustomEvent> {}

export interface Mapping<CustomEvent>
  extends WalkerOSMapping.Config<CustomEvent> {}

export interface EventMapping<CustomEvent = unknown>
  extends WalkerOSMapping.EventConfig<CustomEvent> {}

export type PushEvent<CustomEvent = unknown> =
  WalkerOSDestination.PushEvent<CustomEvent>;
export type PushEvents<CustomEvent = unknown> =
  WalkerOSDestination.PushEvents<CustomEvent>;
