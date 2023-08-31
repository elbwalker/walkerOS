import type { Elbdestination, Elbwalker } from '@elbwalker/types';

export interface Function<Custom = unknown, EventCustom = unknown>
  extends Elbdestination.Function<Custom, EventCustom> {
  init?: (
    config: Partial<Config<Partial<Custom>, Partial<EventCustom>>>,
  ) => Promise<boolean>;
  setup?: (
    config: Partial<Config<Partial<Custom>, Partial<EventCustom>>>,
  ) => Promise<boolean>;
  push: (events: PushEvents) => Promise<Push>;
}

export interface Config<Custom = unknown, EventCustom = unknown>
  extends Elbdestination.Config<Custom, EventCustom> {}

export interface Mapping<EventCustom>
  extends Elbdestination.Mapping<EventCustom> {}

export interface EventConfig<EventCustom = unknown>
  extends Elbdestination.EventConfig<EventCustom> {}

export type PushEvents = Array<PushEvent>;
export type PushEvent = {
  event: Elbwalker.Event;
  config?: Config;
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
