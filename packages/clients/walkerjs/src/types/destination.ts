import type {
  Destination as WalkerOSDestination,
  WalkerOS,
} from '@elbwalker/types';
import type { On, WebClient } from '.';

export interface Destination<Custom = never, EventCustom = never>
  extends WalkerOSDestination.Destination<Custom, EventCustom> {
  config: Config<Custom, EventCustom>;
  init?: (config: Config<Custom, EventCustom>) => void | boolean;
  push: Push<Custom, EventCustom>;
  pushBatch?: PushBatch<Custom, EventCustom>;
}

export type DestinationInit = Partial<Omit<Destination, 'push'>> &
  Pick<Destination, 'push'>;

export type Push<Custom, EventCustom> = (
  event: WalkerOS.Event,
  config: Config<Custom, EventCustom>,
  mapping?: EventConfig<EventCustom>,
  instance?: WebClient.Instance,
) => void;

export type PushBatch<Custom, EventCustom> = (
  batch: WalkerOSDestination.Batch<EventCustom>,
  config: Config<Custom, EventCustom>,
  instance?: WebClient.Instance,
) => void;

export interface Config<Custom = never, EventCustom = never>
  extends WalkerOSDestination.Config<Custom, EventCustom> {
  on?: On.Config; //On events listener rules
}

export interface Mapping<EventCustom = unknown>
  extends WalkerOSDestination.Mapping<EventCustom> {}

export interface EventConfig<EventCustom = never>
  extends WalkerOSDestination.EventConfig<EventCustom> {
  batchFn?: (destination: Destination, instance: WalkerOS.Instance) => void;
}
