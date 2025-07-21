// Export collector-specific modules
export * from './consent';
export * from './destination';
export * from './handle';
export * from './on';

// Export collector-specific constants
export * from './constants';

// Export collector-specific types
export * from './types';

// Main collector functionality
import type { WalkerOS, Elb } from '@walkerOS/core';
import { assign, onLog } from '@walkerOS/core';
import { commonHandleCommand } from './handle';
import { initDestinations, createPush } from './destination';
import type { CreateCollector } from './types';

export async function createCollector(
  initConfig: WalkerOS.InitConfig = {},
): Promise<CreateCollector> {
  const instance = collector(initConfig);

  // Auto-run if configured
  if (instance.config.run) {
    // Apply initial configuration directly to the collector state
    if (initConfig.consent) {
      await (
        instance.push as (
          event: 'walker consent',
          consent: WalkerOS.Consent,
        ) => Promise<Elb.PushResult>
      )('walker consent', initConfig.consent);
    }
    if (initConfig.user) {
      await (
        instance.push as (
          event: 'walker user',
          user: WalkerOS.User,
        ) => Promise<Elb.PushResult>
      )('walker user', initConfig.user);
    }
    if (initConfig.globals) {
      Object.assign(instance.globals, initConfig.globals);
    }
    if (initConfig.custom) {
      Object.assign(instance.custom, initConfig.custom);
    }

    // Actually run the collector to set allowed = true
    await (instance.push as Elb.Fn)('walker run');
  }

  return {
    collector: instance,
    elb: instance.push,
  };
}

function collector(initConfig: WalkerOS.InitConfig): WalkerOS.Collector {
  const version = '0.0.1';

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
