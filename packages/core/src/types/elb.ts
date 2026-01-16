import type { Destination, Hooks, On, WalkerOS } from '.';

// Event signatures only
export interface EventFn<R = Promise<PushResult>> {
  (partialEvent: WalkerOS.DeepPartialEvent): R;
  (event: string): R;
  (event: string, data: WalkerOS.Properties): R;
}

// Complete function interface - can be extended by other interfaces
export interface Fn<R = Promise<PushResult>, Config = unknown>
  extends EventFn<R>, WalkerCommands<R, Config> {
  // Interface intentionally empty - combines EventFn and WalkerCommands
}

// Walker commands (clear, predefined list)
export interface WalkerCommands<R = Promise<PushResult>, Config = unknown> {
  (event: 'walker config', config: Partial<Config>): R;
  (event: 'walker consent', consent: WalkerOS.Consent): R;
  <T extends Destination.Types>(
    event: 'walker destination',
    destination: Destination.Init<T> | Destination.Instance<T>,
    config?: Destination.Config<T>,
  ): R;
  <K extends keyof Hooks.Functions>(
    event: 'walker hook',
    name: K,
    hookFn: Hooks.Functions[K],
  ): R;
  (
    event: 'walker on',
    type: On.Types,
    rules: WalkerOS.SingleOrArray<On.Options>,
  ): R;
  (event: 'walker user', user: WalkerOS.User): R;
  (
    event: 'walker run',
    runState: {
      consent?: WalkerOS.Consent;
      user?: WalkerOS.User;
      globals?: WalkerOS.Properties;
      custom?: WalkerOS.Properties;
    },
  ): R;
}

export type Event<R = Promise<PushResult>> = (
  partialEvent: WalkerOS.DeepPartialEvent,
) => R;

// Simplified push data types for core collector
export type PushData<Config = unknown> =
  | WalkerOS.DeepPartial<Config>
  | WalkerOS.Consent
  | WalkerOS.User
  | WalkerOS.Properties;

export interface PushResult {
  ok: boolean;
  event?: WalkerOS.Event;
  done?: Record<string, Destination.Ref>;
  queued?: Record<string, Destination.Ref>;
  failed?: Record<string, Destination.Ref>;
}

// Simplified Layer type for core collector
export type Layer = Array<IArguments | WalkerOS.DeepPartialEvent | unknown[]>;
