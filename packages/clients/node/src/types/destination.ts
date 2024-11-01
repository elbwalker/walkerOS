import type {
  Destination as WalkerOSDestination,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@elbwalker/types';
import type { NodeClient } from '.';

export interface Destination<Custom = unknown, EventCustom = unknown>
  extends WalkerOSDestination.Destination<Custom, EventCustom> {
  config: Config<Custom, EventCustom>;
  push: PushFn<Custom, EventCustom>;
  init?: InitFn<
    Partial<Config<Custom, EventCustom>>,
    Config<Custom, EventCustom>
  >;
}

export type InitFn<PartialConfig = unknown, Config = unknown> = (
  config: PartialConfig,
  instance?: NodeClient.Instance,
) => Promise<void | Config | false>;

export type PushFn<Custom, EventCustom> = (
  event: WalkerOS.Event,
  config: Config<Custom, EventCustom>,
  mapping?: EventConfig<EventCustom>,
  instance?: NodeClient.Instance,
) => Promise<Push | void>;

export interface Config<Custom = unknown, EventCustom = unknown>
  extends WalkerOSDestination.Config<Custom, EventCustom> {}

export interface Mapping<EventCustom>
  extends WalkerOSMapping.Config<EventCustom> {}

export interface EventConfig<EventCustom = unknown>
  extends WalkerOSMapping.Event<EventCustom> {}

export type PushEvent<EventCustom = unknown> =
  WalkerOSDestination.PushEvent<EventCustom>;
export type PushEvents<EventCustom = unknown> =
  WalkerOSDestination.PushEvents<EventCustom>;

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
