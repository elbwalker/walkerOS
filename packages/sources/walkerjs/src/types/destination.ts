import type {
  Destination as WalkerOSDestination,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@elbwalker/types';
import type { On, SourceWalkerjs } from '.';

export interface Destination<Custom = unknown, CustomEvent = unknown>
  extends WalkerOSDestination.Destination<Custom, CustomEvent> {
  config: Config<Custom, CustomEvent>;
  push: PushFn<Custom, CustomEvent>;
  init?: InitFn<Custom, CustomEvent>;
}

export type DestinationInit = Partial<Omit<Destination, 'push'>> &
  Pick<Destination, 'push'>;

export type InitFn<Custom, CustomEvent> = (
  config: Config<Custom, CustomEvent>,
  instance: SourceWalkerjs.Instance,
) => void | Config | false;

export type PushFn<Custom, CustomEvent> = (
  event: WalkerOS.Event,
  config: Config<Custom, CustomEvent>,
  mapping?: EventMapping<CustomEvent>,
  options?: Options,
) => void;

export type PushBatchFn<Custom, CustomEvent> = (
  batch: WalkerOSDestination.Batch<CustomEvent>,
  config: Config<Custom, CustomEvent>,
  options?: Options,
) => void;

export interface Config<Custom = unknown, CustomEvent = unknown>
  extends WalkerOSDestination.Config<Custom, CustomEvent> {
  on?: On.Config; // On events listener rules
}

export interface Mapping<CustomEvent = unknown>
  extends WalkerOSMapping.Config<CustomEvent> {}

export interface EventMapping<CustomEvent = unknown>
  extends WalkerOSMapping.EventConfig<CustomEvent> {}

export interface Options {
  data?: WalkerOSDestination.Data;
  instance?: SourceWalkerjs.Instance;
}
