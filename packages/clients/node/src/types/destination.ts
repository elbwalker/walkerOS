import type {
  Destination as WalkerOSDestination,
  WalkerOS,
} from '@elbwalker/types';

export interface Destination<Custom = unknown, EventCustom = unknown>
  extends WalkerOSDestination.Destination<Custom, EventCustom> {
  push: PushFn<Custom, EventCustom>;
  init?: InitFn<Custom, EventCustom>;
  setup?: SetupFn<Custom, EventCustom>;
}

export type PushFn<Custom, EventCustom> = (
  events: PushEvents<EventCustom>,
  config: Config<Custom, EventCustom>,
) => Promise<Push> | void;

export type InitFn<Custom, EventCustom> = (
  config: Config<Custom, EventCustom>,
) => Promise<boolean | Config<Custom, EventCustom>>;

export type SetupFn<Custom, EventCustom> = (
  config: Config<Custom, EventCustom>,
) => Promise<boolean | Config<Custom, EventCustom>>;

export interface Config<Custom = unknown, EventCustom = unknown>
  extends WalkerOSDestination.Config<Custom, EventCustom> {}

export interface Mapping<EventCustom>
  extends WalkerOSDestination.Mapping<EventCustom> {}

export interface EventConfig<EventCustom = unknown>
  extends WalkerOSDestination.EventConfig<EventCustom> {}

export type PushEvents<EventCustom = unknown> = Array<PushEvent<EventCustom>>;

export type PushEvent<EventCustom = unknown> = {
  event: WalkerOS.Event;
  mapping?: EventConfig<EventCustom>;
};

export type Ref = {
  id: string;
  destination: Destination;
};

export type Push = {
  queue?: WalkerOS.Events;
  error?: unknown;
};

export type PushSuccess = Array<Ref>;

export type PushFailure = Array<Ref & { error: PushError }>;

export type PushError = string;

export type PushResult = {
  successful: PushSuccess;
  queued: PushSuccess;
  failed: PushFailure;
};

export type SetupResult = {
  successful: PushSuccess;
  failed: PushFailure;
};
