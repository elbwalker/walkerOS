import type { Elbdestination, Elbwalker } from '@elbwalker/types';

export interface Function<Custom = unknown, EventCustom = unknown>
  extends Elbdestination.Function<Custom, EventCustom> {
  init?: (
    config: Config<Custom, EventCustom>,
  ) => Promise<boolean | Config<Custom, EventCustom>>;
  setup?: (
    config: Config<Custom, EventCustom>,
  ) => Promise<boolean | Config<Custom, EventCustom>>;
  push: (events: PushEvents<Custom, EventCustom>) => Promise<Push>;
}

export interface Config<Custom = unknown, EventCustom = unknown>
  extends Elbdestination.Config<Custom, EventCustom> {}

export interface Mapping<EventCustom>
  extends Elbdestination.Mapping<EventCustom> {}

export interface EventConfig<EventCustom = unknown>
  extends Elbdestination.EventConfig<EventCustom> {}

export type PushEvents<Custom = unknown, EventCustom = unknown> = Array<
  PushEvent<Custom, EventCustom>
>;
export type PushEvent<Custom = unknown, EventCustom = unknown> = {
  event: Elbwalker.Event;
  config?: Config<Custom, EventCustom>;
  mapping?: EventConfig;
};

export type Ref = {
  id: string;
  destination: Function;
};

export type Push = {
  queue?: Elbwalker.Events;
  error?: unknown;
};

export type PushSuccess = Array<Ref>;

export type PushFailure = Array<Ref & { error: PushError }>;

export type PushError = unknown;

export type PushResult = {
  successful: PushSuccess;
  queued: PushSuccess;
  failed: PushFailure;
};
