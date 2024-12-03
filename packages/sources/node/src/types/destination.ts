import type {
  Destination as WalkerOSDestination,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@elbwalker/types';
import type { SourceNode } from '.';

export interface Destination<Custom = unknown, CustomEvent = unknown>
  extends WalkerOSDestination.Destination<Custom, CustomEvent> {
  config: Config<Custom, CustomEvent>;
  push: PushFn<Custom, CustomEvent>;
  init?: InitFn<
    Partial<Config<Custom, CustomEvent>>,
    Config<Custom, CustomEvent>
  >;
}

export type InitFn<PartialConfig = unknown, Config = unknown> = (
  config: PartialConfig,
  instance?: SourceNode.Instance,
) => Promise<void | Config | false>;

export type PushFn<Custom, CustomEvent> = (
  event: WalkerOS.Event,
  config: Config<Custom, CustomEvent>,
  mapping?: EventMapping<CustomEvent>,
  options?: Options,
) => Promise<Push | void>;

export interface Config<Custom = unknown, CustomEvent = unknown>
  extends WalkerOSDestination.Config<Custom, CustomEvent> {}

export interface Mapping<CustomEvent>
  extends WalkerOSMapping.Config<CustomEvent> {}

export interface EventMapping<CustomEvent = unknown>
  extends WalkerOSMapping.EventConfig<CustomEvent> {}

export interface Options {
  data?: WalkerOS.Property;
  instance?: SourceNode.Instance;
}

export type PushEvent<CustomEvent = unknown> =
  WalkerOSDestination.PushEvent<CustomEvent>;
export type PushEvents<CustomEvent = unknown> =
  WalkerOSDestination.PushEvents<CustomEvent>;

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
