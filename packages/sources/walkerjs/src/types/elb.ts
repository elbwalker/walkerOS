import type { Elb, On, WalkerOS } from '@elbwalker/types';
import type { Destination, DestinationInit, Config } from './destination';

import type { State } from './source';
import type { Trigger } from './walker';

export interface Fn<R = Return, D = PushData, O = PushOptions, C = PushContext>
  extends Elb.Fn<R, D, O, C>,
    CommandInit<R>,
    CommandDestination<R>,
    CommandOn<R>,
    CommandRun<R> {}

export type CommandInit<R = void> = (
  event: 'walker init',
  scope: Scope | Scope[],
) => R;

export type CommandDestination<R = void> = (
  event: 'walker destination',
  destination: Destination | DestinationInit,
  config?: Config,
) => R;

export type CommandRun<R = void> = (
  event: 'walker run',
  state?: Partial<State>,
) => R;

export type CommandOn<R = void> = (
  event: 'walker on',
  type: 'consent',
  rules: WalkerOS.SingleOrArray<On.ConsentConfig>,
) => R;

export type Layer = Elb.Layer;

export type PushData =
  | Elb.PushData
  | Destination
  | DestinationInit
  | Partial<State>
  | ScopeType;

export type PushOptions =
  | Elb.PushOptions
  | Trigger
  | WalkerOS.SingleOrArray<On.Options>
  | Config;

export type PushContext = Elb.PushContext | Element;

export type Scope = Element | Document;

export type ScopeType = Scope | Scope[];

export type PushResult = Elb.PushResult;

export type Return<R = Promise<PushResult>> = R;
