import type { Collector, WalkerOS, Elb } from '@walkeros/core';
import { assign, onLog } from '@walkeros/core';
import { commonHandleCommand } from './handle';
import { initDestinations, createPush } from './destination';
import { initSources } from './source';

declare const __VERSION__: string;

export async function collector(
  initConfig: Partial<Collector.Config>,
): Promise<Collector.Instance> {
  const version = __VERSION__;

  const defaultConfig: Collector.Config = {
    globalsStatic: {},
    sessionStatic: {},
    tagging: 0,
    verbose: false,
    onLog: log,
    run: true,
    sources: {},
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
    destinations: {},
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

  // Initialize sources and destinations after collector is fully created
  collector.sources = await initSources(collector, config.sources);
  collector.destinations = await initDestinations(
    collector,
    config.destinations,
  );

  return collector;
}
