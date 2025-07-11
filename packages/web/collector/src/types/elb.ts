import type { ElbCore, On, WalkerOS } from '@walkerOS/core';
import type { Destination, Init, Config } from './destination';
import type { Scope, State } from './collector';
import type { Trigger } from './walker';

export interface Fn<R = Return, D = PushData, O = PushOptions, C = PushContext>
  extends ElbCore.Fn<R, D, O, C>,
    Arguments<R>,
    CommandInit<R>,
    CommandDestination<R>,
    CommandOn<R>,
    CommandRun<R> {}

export type Arguments<R = void> = ElbCore.Arguments<
  R,
  PushData,
  PushOptions,
  PushContext
>;

export type CommandInit<R = void> = (
  event: 'walker init',
  scope: Scope | Scope[],
) => R;

export type CommandDestination<R = void> = (
  event: 'walker destination',
  destination: Destination | Init,
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

export type PushData =
  | ElbCore.PushData
  | Destination
  | Init
  | Partial<State>
  | Scope
  | Array<Scope>;

export type PushOptions =
  | ElbCore.PushOptions
  | Trigger
  | WalkerOS.SingleOrArray<On.Options>
  | Config;

export type PushContext = ElbCore.PushContext | Element;

export type PushResult = ElbCore.PushResult;

export type Return<R = Promise<PushResult>> = R;

export type Layer = ElbCore.Layer;
