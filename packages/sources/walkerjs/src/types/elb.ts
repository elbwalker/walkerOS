import type { Elb, WalkerOS } from '@elbwalker/types';
import type { On, DestinationWeb, Walker, SourceWalkerjs } from '.';

export interface Fn<R = void>
  extends Elb.Fn<R>,
    CommandInit<R>,
    CommandDestination<R>,
    CommandRun<R>,
    CommandOn<R>,
    Parameters<R>,
    Event<R> {}

export type CommandInit<R = void> = (
  event: 'walker init',
  scope: Scope | Scope[],
) => R;

export type CommandDestination<R = void> = (
  event: 'walker destination',
  destination: DestinationWeb.Destination | DestinationWeb.DestinationInit,
  config?: DestinationWeb.Config,
) => R;

export type CommandRun<R = void> = (
  event: 'walker run',
  state?: Partial<SourceWalkerjs.State>,
) => R;

export type CommandOn<R = void> = (
  event: 'walker on',
  type: 'consent',
  rules: WalkerOS.SingleOrArray<On.ConsentConfig>,
) => R;

export type Parameters<R = void> = (
  event: string | unknown,
  data?: PushData,
  options?: PushOptions,
  context?: PushContext,
  nested?: WalkerOS.Entities,
  custom?: WalkerOS.Properties,
) => R;

export type Event<R = void> = (partialEvent: WalkerOS.DeepPartialEvent) => R;

export type Layer = [
  string?,
  PushData?,
  PushOptions?,
  WalkerOS.OrderedProperties?,
  WalkerOS.Entities?,
  WalkerOS.Properties?,
];

export type PushData =
  | Elb.PushData
  | DestinationWeb.Destination
  | DestinationWeb.DestinationInit
  | Partial<SourceWalkerjs.State>
  | ScopeType;

export type PushOptions =
  | Elb.PushOptions
  | Walker.Trigger
  | WalkerOS.SingleOrArray<On.Options>
  | DestinationWeb.Config;

export type PushContext = WalkerOS.OrderedProperties;
export type Scope = Element | Document;
export type ScopeType = Scope | Scope[];
