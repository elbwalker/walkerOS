import type { Collector, WalkerOS, Elb } from '@walkeros/core';
import type { CreateCollector, CollectorConfig } from './types';
import { assign, onLog } from '@walkeros/core';
import { commonHandleCommand } from './handle';
import { initDestinations, createPush } from './destination';
import { initSources } from './source';

export async function createCollector<
  TConfig extends Partial<CollectorConfig> = Partial<CollectorConfig>,
>(initConfig: TConfig = {} as TConfig): Promise<CreateCollector> {
  const instance = collector(initConfig);
  const { consent, user, globals, custom, sources } = initConfig;

  if (consent) await instance.push('walker consent', consent);
  if (user) await instance.push('walker user', user);
  if (globals) Object.assign(instance.globals, globals);
  if (custom) Object.assign(instance.custom, custom);

  // Initialize sources if provided
  if (sources) {
    await initSources(instance, sources);
  }

  if (instance.config.run) await instance.push('walker run');

  return {
    collector: instance,
    elb: instance.push,
  };
}

function collector(initConfig: Partial<CollectorConfig>): Collector.Instance {
  const { version } = require('../package.json');

  const defaultConfig: Collector.Config = {
    dryRun: false,
    session: false,
    globalsStatic: {},
    sessionStatic: {},
    tagging: 0,
    verbose: false,
    onLog: log,
    run: true,
    destinations: {},
    consent: {},
    user: {},
    globals: {},
    custom: {},
  };

  const config: Collector.Config = assign(defaultConfig, initConfig, {
    merge: false,
    extend: false,
  });

  function log(message: string, verbose?: boolean) {
    onLog({ message }, verbose || config.verbose);
  }
  config.onLog = log;

  // Enhanced globals with static globals from config
  const finalGlobals = { ...config.globalsStatic, ...config.globals };

  const collector: Collector.Instance = {
    allowed: false,
    config,
    consent: config.consent || {},
    count: 0,
    custom: config.custom || {},
    destinations: initDestinations(config.destinations || {}),
    globals: finalGlobals,
    group: '',
    hooks: {},
    on: {},
    queue: [],
    round: 0,
    session: undefined,
    timing: Date.now(),
    user: config.user || {},
    version,
    sources: {},
    push: undefined as unknown as Elb.Fn, // Placeholder, will be set below
  };

  // Set the push function with the collector reference
  collector.push = createPush(
    collector,
    commonHandleCommand,
    (event: WalkerOS.DeepPartialEvent): WalkerOS.PartialEvent =>
      ({
        timing: Math.round((Date.now() - collector.timing) / 10) / 100,
        source: { type: 'collector', id: '', previous_id: '' },
        ...event,
      }) as WalkerOS.PartialEvent,
  );

  return collector;
}
