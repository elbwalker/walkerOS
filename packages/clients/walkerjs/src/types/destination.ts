/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Destination as WalkerOSDestination,
  WalkerOS,
} from '@elbwalker/types';

export interface Destination<Custom = any, EventCustom = any>
  extends WalkerOSDestination.Destination<Custom, EventCustom> {
  init?: (config: Config<Custom, EventCustom>) => void | boolean;
  push: Push<Custom, EventCustom>;
}

export type DestinationInit = Partial<Omit<Destination, 'push'>> &
  Pick<Destination, 'push'>;

export type Push<Custom, EventCustom> = (
  event: WalkerOS.Event,
  config: Config<Custom, EventCustom>,
  mapping?: EventConfig<EventCustom>,
  instance?: WalkerOS.Instance,
) => void;

export interface Config<Custom = any, EventCustom = any>
  extends WalkerOSDestination.Config<Custom, EventCustom> {}

export interface Mapping<EventCustom>
  extends WalkerOSDestination.Mapping<EventCustom> {}

export interface EventConfig<EventCustom = any>
  extends WalkerOSDestination.EventConfig<EventCustom> {}
