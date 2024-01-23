import type { Destination, WalkerOS } from '@elbwalker/types';

export interface Function<Custom = any, EventCustom = any>
  extends Destination.Function<Custom, EventCustom> {
  init?: (config: Config<Custom, EventCustom>) => boolean;
  push: (
    event: WalkerOS.Event,
    config: Config<Custom, EventCustom>,
    mapping?: EventConfig<EventCustom>,
    runState?: WalkerOS.Config,
  ) => void;
}

export interface Config<Custom = any, EventCustom = any>
  extends Destination.Config<Custom, EventCustom> {}

export interface Mapping<EventCustom>
  extends Destination.Mapping<EventCustom> {}

export interface EventConfig<EventCustom = any>
  extends Destination.EventConfig<EventCustom> {}
