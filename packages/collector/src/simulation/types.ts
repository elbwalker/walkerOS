import type {
  Destination,
  Source,
  Transformer,
  Trigger,
  WalkerOS,
} from '@walkeros/core';

export interface SimulateSource {
  step: 'source';
  name: string;
  code: Source.Init;
  config?: Partial<Source.Config>;
  /** createTrigger factory from the source package's examples. */
  createTrigger?: Trigger.CreateFn;
  /** Trigger type (e.g., 'click', 'POST', 'load'). */
  triggerType?: string;
  /** Trigger options (e.g., CSS selector, threshold). */
  triggerOptions?: unknown;
  /** Content to pass to the trigger function. */
  content?: unknown;
  consent?: WalkerOS.Consent;

  // Legacy fields — kept temporarily for backward compat during migration.
  /** @deprecated Use createTrigger pattern instead. */
  trigger?: (
    input: unknown,
    env: Record<string, unknown>,
  ) => void | (() => void);
  /** @deprecated Use content instead. */
  input?: unknown;
  /** @deprecated Use createTrigger pattern instead. */
  env?: Record<string, unknown>;
}

export interface SimulateTransformer {
  step: 'transformer';
  name: string;
  code: Transformer.Init;
  event: WalkerOS.DeepPartialEvent;
  config?: Partial<Transformer.Config>;
}

export interface SimulateDestination {
  step: 'destination';
  name: string;
  code: Destination.Instance;
  event: WalkerOS.DeepPartialEvent;
  config?: Partial<Destination.Config>;
  consent?: WalkerOS.Consent;
  /** Mock env objects (window, document, fetch, etc.) */
  env?: Record<string, unknown>;
  /** Dot-paths within env to wrap with call recording, e.g. ["window.gtag"] */
  track?: string[];
}

export type SimulateParams =
  | SimulateSource
  | SimulateTransformer
  | SimulateDestination;
