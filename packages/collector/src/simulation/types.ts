import type {
  Destination,
  Source,
  Transformer,
  Trigger,
  WalkerOS,
} from '@walkeros/core';

/**
 * Structured input for source simulation.
 * One format — every consumer constructs this shape.
 */
export interface SourceInput {
  /** The actual source input (HTML string, dataLayer array, HTTP request, etc.) */
  content: unknown;
  /** Which trigger mechanism to fire (e.g., { type: 'click' }) */
  trigger?: {
    type?: string;
    options?: unknown;
  };
  /** Environment overrides (e.g., custom location, localStorage state) */
  env?: Record<string, unknown>;
}

export interface SimulateSource {
  step: 'source';
  name: string;
  code: Source.Init;
  config?: Partial<Source.Config>;
  /** createTrigger factory from the source package's examples. */
  createTrigger: Trigger.CreateFn;
  /** Structured source input. */
  input: SourceInput;
  consent?: WalkerOS.Consent;
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
