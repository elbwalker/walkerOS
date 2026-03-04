import type {
  Collector,
  Source,
  Destination,
  Simulation,
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

// --- Flow simulation ---

/**
 * Simulate a full flow with per-step observability.
 *
 * Runs the collector with the given config, injects input at the target step,
 * wraps destinations/transformers to emit StepLog entries, and returns the
 * updated collector state.
 *
 * This function is tree-shakeable — production code never imports it.
 * Both CLI and app call this for consistent simulation behavior.
 */
export async function simulateFlow(
  params: Simulation.SimulateFlowParams,
): Promise<Simulation.SimulateFlowResult> {
  const { config, step, input, state = {}, onStep } = params;
  const stepLogs: Simulation.StepLog[] = [];

  function emitLog(log: Simulation.StepLog) {
    stepLogs.push(log);
    onStep?.(log);
  }

  // Parse step identifier: "source.dataLayer" -> { type: "source", name: "dataLayer" }
  const dotIndex = step.indexOf('.');
  const stepType = dotIndex > -1 ? step.substring(0, dotIndex) : step;

  // Apply prior state as initial consent/user/globals
  const initConfig: Collector.InitConfig = {
    consent: state.consent || {},
    user: state.user,
    globals: state.globals,
    custom: state.custom,
  };

  const start = Date.now();

  try {
    if (stepType === 'destination') {
      return await simulateFlowDestination(
        step,
        input,
        initConfig,
        state,
        emitLog,
      );
    }

    if (stepType === 'transformer') {
      return await simulateFlowTransformer(
        step,
        input,
        initConfig,
        state,
        emitLog,
      );
    }

    // Default: source or unknown step type — use basic collector flow
    const { collector } = await startFlow(initConfig);

    if (state.allowed !== false) {
      await collector.command('run');
    }

    emitLog({
      step,
      status: 'processed',
      in: input,
      out: undefined,
      duration: Date.now() - start,
    });

    const updatedState = extractState(collector);

    try {
      await collector.command('shutdown');
    } catch {
      /* ignore shutdown errors */
    }

    return { stepLogs, state: updatedState };
  } catch (error) {
    emitLog({
      step,
      status: 'blocked',
      in: input,
      duration: Date.now() - start,
    });

    return { stepLogs, state: { ...state } };
  }
}

async function simulateFlowDestination(
  step: string,
  input: unknown,
  initConfig: Collector.InitConfig,
  state: Simulation.FlowState,
  emitLog: (log: Simulation.StepLog) => void,
): Promise<Simulation.SimulateFlowResult> {
  const start = Date.now();
  const stepLogs: Simulation.StepLog[] = [];

  function emit(log: Simulation.StepLog) {
    stepLogs.push(log);
    emitLog(log);
  }

  // Track what the destination receives
  let pushReceived = false;
  const pushResults: unknown[] = [];

  const destInstance: Destination.Instance = {
    type: 'sim-dest',
    config: {},
    push(event, context) {
      pushReceived = true;
      pushResults.push(event);
    },
  };

  const { collector } = await startFlow({
    ...initConfig,
    destinations: {
      sim: { code: destInstance },
    },
  });

  if (state.allowed !== false) {
    await collector.command('run');
  }

  // Push the event through the collector -> destination pipeline
  const event = input as WalkerOS.DeepPartialEvent;
  await collector.push(event);

  emit({
    step,
    status: pushReceived ? 'processed' : 'blocked',
    in: input,
    out: pushReceived ? pushResults[0] : undefined,
    duration: Date.now() - start,
  });

  const updatedState = extractState(collector);

  try {
    await collector.command('shutdown');
  } catch {
    /* ignore */
  }

  return { stepLogs, state: updatedState };
}

async function simulateFlowTransformer(
  step: string,
  input: unknown,
  initConfig: Collector.InitConfig,
  state: Simulation.FlowState,
  emitLog: (log: Simulation.StepLog) => void,
): Promise<Simulation.SimulateFlowResult> {
  const start = Date.now();
  const stepLogs: Simulation.StepLog[] = [];

  function emit(log: Simulation.StepLog) {
    stepLogs.push(log);
    emitLog(log);
  }

  // Create a passthrough transformer that captures the result
  let transformResult: WalkerOS.DeepPartialEvent | false | void;

  const transformerInit: Transformer.Init = () => ({
    type: 'sim-transformer',
    config: {},
    push(event) {
      transformResult = event;
      return event;
    },
  });

  const { collector } = await startFlow({
    ...initConfig,
    transformers: {
      sim: { code: transformerInit },
    },
  });

  const instance = collector.transformers.sim;
  if (!instance) {
    emit({
      step,
      status: 'blocked',
      in: input,
      duration: Date.now() - start,
    });
    return { stepLogs, state: { ...state } };
  }

  const event = input as WalkerOS.DeepPartialEvent;
  const result = await instance.push(event, {
    collector,
    logger: collector.logger.scope('transformer').scope('sim'),
    id: 'sim',
    config: instance.config,
    env: instance.config.env || {},
  });

  const status =
    result === false
      ? 'filtered'
      : result === undefined
        ? 'processed'
        : 'processed';

  emit({
    step,
    status,
    in: input,
    out: result === false ? undefined : result || input,
    duration: Date.now() - start,
  });

  const updatedState = extractState(collector);

  try {
    await collector.command('shutdown');
  } catch {
    /* ignore */
  }

  return { stepLogs, state: updatedState };
}

function extractState(collector: Collector.Instance): Simulation.FlowState {
  return {
    consent: { ...collector.consent },
    user: { ...collector.user },
    globals: { ...collector.globals },
    custom: { ...collector.custom },
    allowed: collector.allowed,
  };
}
