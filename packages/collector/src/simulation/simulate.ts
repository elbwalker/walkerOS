import type { Collector, Simulation, WalkerOS } from '@walkeros/core';
import { createIngest } from '@walkeros/core';
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
    ingest: createIngest('sim'),
    config: instance.config,
    env: instance.config?.env || {},
  });

  let events: WalkerOS.DeepPartialEvent[];
  if (result === false) {
    events = [];
  } else if (result == null) {
    events = [event];
  } else if (Array.isArray(result)) {
    events = result.map((r) => r.event || event);
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
  const { code, config = {}, createTrigger: factory, input, consent } = params;
  const { content, trigger: triggerMeta } = input;

  const ALL_CONSENT: WalkerOS.Consent = {
    functional: true,
    marketing: true,
    analytics: true,
  };

  const events: WalkerOS.DeepPartialEvent[] = [];

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

  const { trigger } = await factory(fullConfig);

  if (content !== undefined) {
    await trigger(triggerMeta?.type, triggerMeta?.options)(content);
  }

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

  let calls: Simulation.Call[] = [];
  let destEnv: Record<string, unknown> | undefined = env;

  if (env && track && track.length > 0) {
    const wrapped = wrapEnv({ ...env, simulation: track });
    destEnv = wrapped.wrappedEnv;
    calls = wrapped.calls;
  }

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
