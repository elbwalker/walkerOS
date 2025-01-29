import type { Hooks, WalkerOS } from '.';

export interface Fn<R = void>
  extends Event<R>,
    CommandConfig<R>,
    CommandConsent<R>,
    CommandHook<R>,
    CommandUser<R> {}

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
