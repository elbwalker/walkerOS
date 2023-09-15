import type { Elbdestination, Elbwalker } from '@elbwalker/types';

export interface Function<Custom = unknown, EventCustom = unknown>
  extends Elbdestination.Function<Custom, EventCustom> {
  push: PushFn<Custom, EventCustom>;
  init?: InitFn<Custom, EventCustom>;
  setup?: SetupFn<Custom, EventCustom>;
}
export type PushFn<Custom, EventCustom> = (
  events: PushEvents<EventCustom>,
  config: Config<Custom, EventCustom>,
) => Promise<Push>;

export type InitFn<Custom, EventCustom> = (
  config: Config<Custom, EventCustom>,
) => Promise<boolean | Config<Custom, EventCustom>>;

export type SetupFn<Custom, EventCustom> = (
  config: Config<Custom, EventCustom>,
) => Promise<boolean | Config<Custom, EventCustom>>;

export interface Config<Custom = unknown, EventCustom = unknown>
  extends Elbdestination.Config<Custom, EventCustom> {}

export interface Mapping<EventCustom>
  extends Elbdestination.Mapping<EventCustom> {}

export interface EventConfig<EventCustom = unknown>
  extends Elbdestination.EventConfig<EventCustom> {}

export type PushEvents<EventCustom = unknown> = Array<PushEvent<EventCustom>>;

export type PushEvent<EventCustom = unknown> = {
  event: Elbwalker.Event;
  mapping?: EventConfig<EventCustom>;
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
