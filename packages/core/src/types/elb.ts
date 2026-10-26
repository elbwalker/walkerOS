import type { Destination, Hooks, On, WalkerOS } from '.';
import type { FailureReason } from '../stepError';

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
    init: Destination.Init<T>,
  ): R;
  <K extends keyof Hooks.Functions>(
    event: 'walker hook',
    init: { name: K; fn: Hooks.Functions[K] },
  ): R;
  (
    event: 'walker on',
    init: {
      type: On.Types;
      rules: WalkerOS.SingleOrArray<On.Subscription>;
    },
  ): R;
  (event: 'walker user', user: WalkerOS.User): R;
  (
    event: 'walker run',
    runState?: {
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
  /** Event was intentionally not forwarded: a transformer chain stopped it. */
  dropped?: boolean;
  /** Event was rejected as invalid input: a client/producer fault, not a pipeline failure. */
  invalid?: boolean;
  /**
   * Human-readable message when the event was rejected or a step before the
   * destinations failed. A destination's own failure is in `failed`, under
   * its id with a `reason`, and leaves this unset.
   */
  error?: string;
  /**
   * Why the push failed when `ok` is false without a `failed` entry: a full
   * pre-run queue (`queue-full`), a transformer that threw (`transformer`)
   * or is not ready, a rule `condition` that threw (`mapping`).
   */
  reason?: FailureReason;
}

// Simplified Layer type for core collector
export type Layer = Array<IArguments | WalkerOS.DeepPartialEvent | unknown[]>;
