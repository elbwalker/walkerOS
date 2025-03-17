import type { Destination, Hooks, WalkerOS } from '.';

export interface Fn<R = void, D = PushData, O = PushOptions, C = PushContext>
  extends Event<R>,
    Arguments<R, D, O, C>,
    CommandConfig<R>,
    CommandConsent<R>,
    CommandHook<R>,
    CommandUser<R> {}

export type Arguments<
  R = void,
  D = PushData,
  O = PushOptions,
  C = PushContext,
> = (
  event?: string,
  data?: D,
  options?: O,
  context?: C,
  nested?: WalkerOS.Entities,
  custom?: WalkerOS.Properties,
) => R;
export type CommandConfig<R = void> = (
  event: 'walker config',
  config: Partial<WalkerOS.Config>,
) => R;
export type CommandConsent<R = void> = (
  event: 'walker consent',
  consent: WalkerOS.Consent,
) => R;
export type CommandHook<R = void> = <K extends keyof Hooks.Functions>(
  event: 'walker hook',
  name: K,
  hookFn: Hooks.Functions[K],
) => R;
export type CommandUser<R = void> = (
  event: 'walker user',
  user: WalkerOS.User,
) => R;
export type Event<R = void> = (partialEvent: WalkerOS.DeepPartialEvent) => R;

export type PushData =
  | string
  | object
  | WalkerOS.DeepPartial<WalkerOS.Config>
  | WalkerOS.Consent
  | WalkerOS.User
  | WalkerOS.Properties;

export type PushOptions = Hooks.AnyFunction | object;

export type PushContext = WalkerOS.OrderedProperties;

export interface PushResult extends Destination.Result {
  event?: WalkerOS.Event;
  status: Status;
}

export interface Status {
  ok: boolean;
  error?: string;
}

type FnParameters<T> = T extends (...args: unknown[]) => unknown
  ? Parameters<T>[number]
  : never;

export type Layer = Array<
  | IArguments
  | WalkerOS.DeepPartialEvent
  | FnParameters<Fn[keyof Fn]>
  | Parameters<Arguments>[number]
>;
