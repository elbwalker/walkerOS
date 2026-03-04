import type {
  Collector,
  Source,
  Destination,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { startFlow } from './flow';

const ALL_CONSENT: WalkerOS.Consent = {
  functional: true,
  marketing: true,
  analytics: true,
};

// --- Source simulation ---

export interface SimulateSourceOptions {
  /** Source init function */
  code: Source.Init;
  /** Source config (mapping, settings, etc.) */
  config?: Partial<Source.Config>;
  /** Setup function from source package examples */
  setup?: Source.SetupFn;
  /** Input value passed to setup */
  input?: unknown;
  /** Execution environment (JSDOM window for CLI, iframe window for app) */
  env: Source.SimulationEnv;
  /** Consent grants (defaults to all-granted) */
  consent?: WalkerOS.Consent;
}

export interface SimulateSourceResult {
  /** Pre-collector events captured by spy transformer */
  capturedEvents: WalkerOS.DeepPartialEvent[];
  /** Collector instance for inspection/cleanup */
  collector: Collector.Instance;
}

/**
 * Simulate a source: wire spy transformer via source.next,
 * handle setup/trigger, capture pre-collector events.
 *
 * 1. Run setup(input, env) — prepares browser state
 * 2. startFlow with source + spy transformer
 * 3. Fire trigger if setup returned one
 * 4. Return captured events
 */
export async function simulateSource(
  options: SimulateSourceOptions,
): Promise<SimulateSourceResult> {
  const {
    code,
    config = {},
    setup,
    input,
    env,
    consent = ALL_CONSENT,
  } = options;

  // 1. Run setup before startFlow
  let trigger: (() => void) | undefined;
  if (setup) {
    const result = setup(input, env);
    if (typeof result === 'function') {
      trigger = result;
    }
  }

  // 2. Spy captures events via source.next
  const capturedEvents: WalkerOS.DeepPartialEvent[] = [];

  const { collector } = await startFlow({
    consent,
    sources: {
      sim: {
        code,
        config,
        env,
        next: 'spy',
      },
    },
    transformers: {
      spy: {
        code: () => ({
          type: 'spy',
          config: {},
          push(event: WalkerOS.DeepPartialEvent) {
            capturedEvents.push(JSON.parse(JSON.stringify(event)));
            return event;
          },
        }),
      },
    },
  });

  // 3. Fire trigger after startFlow
  if (trigger) trigger();

  return { capturedEvents, collector };
}

// --- Destination simulation ---

export interface SimulateDestinationOptions {
  /** Event to push through the destination */
  event: WalkerOS.DeepPartialEvent;
  /** Destination instance (object with push method) */
  code: Destination.Instance;
  /** Destination config (mapping, settings, etc.) */
  config?: Partial<Destination.Config>;
  /** Consent grants (defaults to all-granted) */
  consent?: WalkerOS.Consent;
}

export interface SimulateDestinationResult {
  /** Collector instance for inspection/cleanup */
  collector: Collector.Instance;
}

/**
 * Simulate a destination: start flow with single destination, push event.
 * The destination's push() is called with the mapped event and context.
 */
export async function simulateDestination(
  options: SimulateDestinationOptions,
): Promise<SimulateDestinationResult> {
  const { event, code, config = {}, consent = ALL_CONSENT } = options;

  const { collector } = await startFlow({
    consent,
    destinations: {
      sim: {
        code,
        config,
      },
    },
  });

  await collector.push(event);

  return { collector };
}

// --- Transformer simulation ---

export interface SimulateTransformerOptions {
  /** Event to transform */
  event: WalkerOS.DeepPartialEvent;
  /** Transformer init function */
  code: Transformer.Init;
  /** Transformer config */
  config?: Partial<Transformer.Config>;
}

export interface SimulateTransformerResult {
  /** Result: modified event, false (drop), or void (passthrough) */
  transformedEvent: WalkerOS.DeepPartialEvent | false | void;
}

/**
 * Simulate a transformer: init via startFlow, call push directly.
 */
export async function simulateTransformer(
  options: SimulateTransformerOptions,
): Promise<SimulateTransformerResult> {
  const { event, code, config = {} } = options;

  // Use startFlow to properly init the transformer with real context
  const { collector } = await startFlow({
    transformers: {
      sim: { code, config },
    },
  });

  const instance = collector.transformers.sim;
  if (!instance) {
    throw new Error('Transformer failed to initialize');
  }

  // Call push directly with the transformer's own context
  const result = await instance.push(event, {
    collector,
    logger: collector.logger.scope('transformer').scope('sim'),
    id: 'sim',
    config: instance.config,
    env: instance.config.env || {},
  });

  await collector.command('shutdown');

  return {
    transformedEvent: result as WalkerOS.DeepPartialEvent | false | void,
  };
}
