import type {
  Destination as WalkerOSDestination,
  WalkerOS,
} from '@elbwalker/types';
import type { On, WebClient } from '.';

export interface Destination<Custom = never, EventCustom = never>
  extends WalkerOSDestination.Destination<Custom, EventCustom> {
  config: Config<Custom, EventCustom>;
  init?: InitFn<Custom, EventCustom>;
  push: PushFn<Custom, EventCustom>;
  pushBatch?: PushBatchFn<Custom, EventCustom>;
}

export type DestinationInit = Partial<Omit<Destination, 'push'>> &
  Pick<Destination, 'push'>;

export type InitFn<Custom, EventCustom> = (
  config: Config<Custom, EventCustom>,
  instance: WebClient.Instance,
) => void | boolean;

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

export interface Config<Custom = never, EventCustom = never>
  extends WalkerOSDestination.Config<Custom, EventCustom> {
  on?: On.Config; // On events listener rules
}

export interface Mapping<EventCustom = unknown>
  extends WalkerOSDestination.Mapping<EventCustom> {}

export interface EventConfig<EventCustom = never>
  extends WalkerOSDestination.EventConfig<EventCustom> {
  batchFn?: (destination: Destination, instance: WebClient.Instance) => void;
}
