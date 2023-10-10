import type { Elbdestination, WalkerOS } from '@elbwalker/types';

export interface Function<Custom = unknown, EventCustom = unknown>
  extends Elbdestination.Function<Custom, EventCustom> {
  init?: (config: Config<Custom, EventCustom>) => boolean;
  push: (
    event: WalkerOS.Event,
    config: Config<Custom, EventCustom>,
    mapping?: EventConfig<EventCustom>,
    runState?: WalkerOS.Config,
  ) => void;
}

export interface Config<Custom = unknown, EventCustom = unknown>
  extends Elbdestination.Config<Custom, EventCustom> {}

export interface Mapping<EventCustom>
  extends Elbdestination.Mapping<EventCustom> {}

export interface EventConfig<EventCustom = unknown>
  extends Elbdestination.EventConfig<EventCustom> {}
