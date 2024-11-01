import type {
  Destination as WalkerOSDestination,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@elbwalker/types';
import type { On, WebClient } from '.';

export interface Destination<Custom = unknown, EventCustom = unknown>
  extends WalkerOSDestination.Destination<Custom, EventCustom> {
  config: Config<Custom, EventCustom>;
  push: PushFn<Custom, EventCustom>;
  init?: InitFn<Custom, EventCustom>;
}

export type DestinationInit = Partial<Omit<Destination, 'push'>> &
  Pick<Destination, 'push'>;

export type InitFn<Custom, EventCustom> = (
  config: Config<Custom, EventCustom>,
  instance: WebClient.Instance,
) => void | Config | false;

export type PushFn<Custom, EventCustom> = (
  event: WalkerOS.Event,
  config: Config<Custom, EventCustom>,
  mapping?: EventConfig<EventCustom>,
  instance?: WebClient.Instance,
) => void;

export type PushBatchFn<Custom, EventCustom> = (
  batch: WalkerOSDestination.Batch<EventCustom>,
  config: Config<Custom, EventCustom>,
  instance?: WebClient.Instance,
) => void;

export interface Config<Custom = unknown, EventCustom = unknown>
  extends WalkerOSDestination.Config<Custom, EventCustom> {
  on?: On.Config; // On events listener rules
}

export interface Mapping<EventCustom = unknown>
  extends WalkerOSMapping.Config<EventCustom> {}

export interface EventConfig<EventCustom = unknown>
  extends WalkerOSMapping.Event<EventCustom> {}
