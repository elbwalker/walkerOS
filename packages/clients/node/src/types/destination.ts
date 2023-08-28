import type { Elbdestination, Elbwalker } from '@elbwalker/types';

export interface Function<Custom = unknown, EventCustom = unknown>
  extends Elbdestination.Function<Custom, EventCustom> {
  init?: (
    config: Partial<Config<Partial<Custom>, Partial<EventCustom>>>,
  ) => Promise<boolean>;
  setup?: (
    config: Partial<Config<Partial<Custom>, Partial<EventCustom>>>,
  ) => Promise<boolean>;
  push: (
    event: Elbwalker.Event,
    config?: Config<Custom, EventCustom>,
    mapping?: EventConfig<EventCustom>,
  ) => Promise<void>; // @TODO return failed events
}

export interface Config<Custom = unknown, EventCustom = unknown>
  extends Elbdestination.Config<Custom, EventCustom> {}

export interface Mapping<EventCustom>
  extends Elbdestination.Mapping<EventCustom> {}

export interface EventConfig<EventCustom = unknown>
  extends Elbdestination.EventConfig<EventCustom> {}

export type PushResult = {
  id: string;
  destination: Function;
};

export type PushSuccess = Array<PushResult>;

export type PushFailure = Array<PushResult & { error: PushError }>;

export type PushError = unknown;
