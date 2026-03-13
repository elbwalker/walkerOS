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
  trigger?: Trigger.SetupFn;
  input?: unknown;
  env: Trigger.SimulationEnv;
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
