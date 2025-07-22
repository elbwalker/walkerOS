import type { WalkerOS, Elb } from '@walkerOS/core';
import type { CreateCollector } from './types';
import { assign, onLog } from '@walkerOS/core';
import { commonHandleCommand } from './handle';
import { initDestinations, createPush } from './destination';

export async function createCollector(
  initConfig: WalkerOS.InitConfig = {},
): Promise<CreateCollector> {
  const instance = collector(initConfig);
  const { consent, user, globals, custom } = initConfig;

  if (consent) await instance.push('walker consent', consent);
  if (user) await instance.push('walker user', user);
  if (globals) Object.assign(instance.globals, globals);
  if (custom) Object.assign(instance.custom, custom);

  if (instance.config.run) await instance.push('walker run');

  return {
    collector: instance,
    elb: instance.push,
  };
}

function collector(initConfig: WalkerOS.InitConfig): WalkerOS.Collector {
  const { version } = require('../package.json');

  const defaultConfig: WalkerOS.Config = {
    dryRun: false,
    session: false,
    globalsStatic: {},
    sessionStatic: {},
    tagging: 0,
    verbose: false,
    onLog: log,
    run: true,
  };

  // Extract config-specific properties and non-config properties separately
  const {
    destinations = {},
    consent = {},
    user = {},
    globals = {},
    custom = {},
    ...configProps
  } = initConfig;

  const config: WalkerOS.Config = assign(defaultConfig, configProps, {
    merge: false,
    extend: false,
  });

  function log(message: string, verbose?: boolean) {
    onLog({ message }, verbose || config.verbose);
  }
  config.onLog = log;

  // Enhanced globals with static globals from init
  const finalGlobals = { ...config.globalsStatic, ...globals };

  const collector: WalkerOS.Collector = {
    allowed: false,
    config,
    consent,
    count: 0,
    custom,
    destinations: initDestinations(destinations),
    globals: finalGlobals,
    group: '',
    hooks: {},
    on: {},
    queue: [],
    round: 0,
    session: undefined,
    timing: Date.now(),
    user,
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
