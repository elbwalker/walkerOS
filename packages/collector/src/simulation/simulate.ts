import type { Collector, Simulation, WalkerOS } from '@walkeros/core';
import { startFlow } from '../flow';
import { wrapEnv } from '../wrapEnv';
import type { SimulateParams } from './types';

export async function simulate(
  params: SimulateParams,
): Promise<Simulation.Result> {
  const start = Date.now();

  try {
    switch (params.step) {
      case 'transformer':
        return await runTransformer(params, start);
      case 'source':
        return await runSource(params, start);
      case 'destination':
        return await runDestination(params, start);
    }
  } catch (error) {
    return {
      step: params.step,
      name: params.name,
      events: [],
      calls: [],
      duration: Date.now() - start,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

async function runTransformer(
  params: Extract<SimulateParams, { step: 'transformer' }>,
  start: number,
): Promise<Simulation.Result> {
  const { code, config = {}, event } = params;

  const { collector } = await startFlow({
    transformers: { sim: { code, config } },
  });

  const instance = collector.transformers?.sim;
  if (!instance) throw new Error('Transformer failed to initialize');

  const result = await instance.push(event, {
    collector,
    logger: collector.logger.scope('transformer').scope('sim'),
    id: 'sim',
    config: instance.config,
    env: instance.config?.env || {},
  });

  // Normalize: false → [], void → [original], { event } → [event]
  let events: WalkerOS.DeepPartialEvent[];
  if (result === false) {
    events = [];
  } else if (result == null) {
    events = [event];
  } else {
    events = [result.event || event];
  }

  return {
    step: 'transformer',
    name: params.name,
    events,
    calls: [],
    duration: Date.now() - start,
  };
}

async function runSource(
  params: Extract<SimulateParams, { step: 'source' }>,
  start: number,
): Promise<Simulation.Result> {
  // New createTrigger path — package manages lifecycle
  if (params.createTrigger) {
    return await runSourceWithCreateTrigger(params, start);
  }

  // Legacy path — orchestrator manages lifecycle
  return await runSourceLegacy(params, start);
}

async function runSourceWithCreateTrigger(
  params: Extract<SimulateParams, { step: 'source' }>,
  start: number,
): Promise<Simulation.Result> {
  const {
    code,
    config = {},
    createTrigger: factory,
    triggerType,
    triggerOptions,
    content,
    consent,
  } = params;
  const ALL_CONSENT: WalkerOS.Consent = {
    functional: true,
    marketing: true,
    analytics: true,
  };

  // Spy captures events via source.next transformer
  const events: WalkerOS.DeepPartialEvent[] = [];

  // Build initConfig for createTrigger — full config with spy wiring
  const fullConfig: Collector.InitConfig = {
    consent: consent || ALL_CONSENT,
    sources: {
      sim: { code, config, next: 'spy' },
    },
    transformers: {
      spy: {
        code: () => ({
          type: 'spy',
          config: {},
          push(event: WalkerOS.DeepPartialEvent) {
            events.push(JSON.parse(JSON.stringify(event)));
            return { event };
          },
        }),
      },
    },
  };

  // createTrigger — startFlow is lazy, deferred to first trigger() call
  const { trigger } = await factory!(fullConfig);

  // Fire trigger with content — startFlow runs on first invocation
  if (content !== undefined) {
    await trigger(triggerType, triggerOptions)(content);
  }

  return {
    step: 'source',
    name: params.name,
    events,
    calls: [],
    duration: Date.now() - start,
  };
}

async function runSourceLegacy(
  params: Extract<SimulateParams, { step: 'source' }>,
  start: number,
): Promise<Simulation.Result> {
  const { code, config = {}, trigger: triggerFn, input, env, consent } = params;
  const ALL_CONSENT: WalkerOS.Consent = {
    functional: true,
    marketing: true,
    analytics: true,
  };

  // Run trigger before startFlow — may return a post-init function
  let postInitTrigger: (() => void) | undefined;
  if (triggerFn) {
    const result = triggerFn(input, env || {});
    if (typeof result === 'function') postInitTrigger = result;
  }

  // Spy captures events via source.next transformer
  const events: WalkerOS.DeepPartialEvent[] = [];

  const { collector } = await startFlow({
    consent: consent || ALL_CONSENT,
    sources: {
      sim: { code, config, env, next: 'spy' },
    },
    transformers: {
      spy: {
        code: () => ({
          type: 'spy',
          config: {},
          push(event: WalkerOS.DeepPartialEvent) {
            events.push(JSON.parse(JSON.stringify(event)));
            return { event };
          },
        }),
      },
    },
  });

  // Fire trigger after startFlow (source is initialized)
  if (postInitTrigger) postInitTrigger();

  return {
    step: 'source',
    name: params.name,
    events,
    calls: [],
    duration: Date.now() - start,
  };
}

async function runDestination(
  params: Extract<SimulateParams, { step: 'destination' }>,
  start: number,
): Promise<Simulation.Result> {
  const { code, config = {}, event, consent, env, track } = params;
  const ALL_CONSENT: WalkerOS.Consent = {
    functional: true,
    marketing: true,
    analytics: true,
  };

  // Wrap env with call tracking if track paths are provided
  let calls: Simulation.Call[] = [];
  let destEnv: Record<string, unknown> | undefined = env;

  if (env && track && track.length > 0) {
    const wrapped = wrapEnv({ ...env, simulation: track });
    destEnv = wrapped.wrappedEnv;
    calls = wrapped.calls;
  }

  // Wire destination with optional env into collector
  const destConfig = { ...config };
  if (destEnv) {
    destConfig.env = destEnv;
  }

  const { collector } = await startFlow({
    consent: consent || ALL_CONSENT,
    destinations: { sim: { code, config: destConfig } },
  });

  await collector.push(event);

  return {
    step: 'destination',
    name: params.name,
    events: [],
    calls,
    duration: Date.now() - start,
  };
}
