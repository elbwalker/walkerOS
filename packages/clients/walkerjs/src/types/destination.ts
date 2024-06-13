import type {
  Destination as WalkerOSDestination,
  WalkerOS,
} from '@elbwalker/types';

export interface Destination<Custom = never, EventCustom = never>
  extends WalkerOSDestination.Destination<Custom, EventCustom> {
  init?: (config: Config<Custom, EventCustom>) => void | boolean;
  push: Push<Custom, EventCustom>;
  pushBatch?: PushBatch<Custom, EventCustom>;
  batchFn?: (destination: Destination, instance: WalkerOS.Instance) => void;
}

export type DestinationInit = Partial<Omit<Destination, 'push'>> &
  Pick<Destination, 'push'>;

export type Push<Custom, EventCustom> = (
  event: WalkerOS.Event,
  config: Config<Custom, EventCustom>,
  mapping?: EventConfig<EventCustom>,
  instance?: WalkerOS.Instance,
) => void;

export type PushBatch<Custom, EventCustom> = (
  events: WalkerOSDestination.Batch<EventCustom>,
  config: Config<Custom, EventCustom>,
  instance?: WalkerOS.Instance,
) => void;

export interface Config<Custom = never, EventCustom = never>
  extends WalkerOSDestination.Config<Custom, EventCustom> {}

export interface Mapping<EventCustom = unknown>
  extends WalkerOSDestination.Mapping<EventCustom> {}

export interface EventConfig<EventCustom = never>
  extends WalkerOSDestination.EventConfig<EventCustom> {}
