import type { Elb, WalkerOS } from '@elbwalker/types';
import type { On, DestinationWeb, Walker, SourceWalkerjs } from '.';

export interface Fn<R = void>
  extends Elb.Fn<R>,
    Arguments<R>,
    CommandInit<R>,
    CommandDestination<R>,
    CommandOn<R>,
    CommandRun<R> {}

export type Arguments<R = void> = (
  event?: string,
  data?: PushData,
  options?: PushOptions,
  context?: PushContext,
  nested?: WalkerOS.Entities,
  custom?: WalkerOS.Properties,
) => R;

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

type FnParameters<T> = T extends (...args: unknown[]) => unknown
  ? Parameters<T>[number]
  : never;

export type Layer = Array<
  | IArguments
  | WalkerOS.DeepPartialEvent
  | FnParameters<Fn[keyof Fn]>
  | Parameters<Arguments>[number]
>;

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

export type PushContext = Elb.PushContext | Element;
export type Scope = Element | Document;
export type ScopeType = Scope | Scope[];
