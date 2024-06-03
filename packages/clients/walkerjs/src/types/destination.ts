import type {
  Destination as WalkerOSDestination,
  WalkerOS,
} from '@elbwalker/types';

export interface Destination<Custom = never, EventCustom = never>
  extends WalkerOSDestination.Destination<Custom, EventCustom> {
  init?: Init<Custom, EventCustom>;
  push: Push<Custom, EventCustom>;
}

export type DestinationInit = Partial<Omit<Destination, 'push'>> &
  Pick<Destination, 'push'>;

export type Init<Custom, EventCustom> = (
  config: Config<Custom, EventCustom>,
) => WalkerOS.MaybePromise<void | boolean>;

export type Push<Custom, EventCustom> = (
  event: WalkerOS.Event,
  config: Config<Custom, EventCustom>,
  mapping?: EventConfig<EventCustom>,
  instance?: WalkerOS.Instance,
) => WalkerOS.MaybePromise<void>;

export interface Config<Custom = never, EventCustom = never>
  extends WalkerOSDestination.Config<Custom, EventCustom> {}

export interface Mapping<EventCustom>
  extends WalkerOSDestination.Mapping<EventCustom> {}

export interface EventConfig<EventCustom = never>
  extends WalkerOSDestination.EventConfig<EventCustom> {}
