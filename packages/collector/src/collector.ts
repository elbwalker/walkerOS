import type { Collector, WalkerOS } from '@walkeros/core';
import { assign, onLog } from '@walkeros/core';
import { commonHandleCommand } from './handle';
import { initDestinations } from './destination';
import { createPush } from './push';
import { createCommand } from './command';
import { initSources } from './source';

declare const __VERSION__: string;

export async function collector(
  initConfig: Collector.InitConfig,
): Promise<Collector.Instance> {
  const version = __VERSION__;

  const defaultConfig: Collector.Config = {
    globalsStatic: {},
    sessionStatic: {},
    tagging: 0,
    verbose: false,
    onLog: log,
    run: true,
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
  const finalGlobals = { ...config.globalsStatic, ...initConfig.globals };

  const collector: Collector.Instance = {
    allowed: false,
    config,
    consent: initConfig.consent || {},
    count: 0,
    custom: initConfig.custom || {},
    destinations: {},
    globals: finalGlobals,
    group: '',
    hooks: {},
    on: {},
    queue: [],
    round: 0,
    session: undefined,
    timing: Date.now(),
    user: initConfig.user || {},
    version,
    sources: {},
    push: undefined as unknown as Collector.PushFn, // Placeholder, will be set below
    command: undefined as unknown as Collector.CommandFn, // Placeholder, will be set below
  };

  // Set the push and command functions with the collector reference
  collector.push = createPush(
    collector,
    (event: WalkerOS.DeepPartialEvent): WalkerOS.PartialEvent =>
      ({
        timing: Math.round((Date.now() - collector.timing) / 10) / 100,
        source: { type: 'collector', id: '', previous_id: '' },
        ...event,
      }) as WalkerOS.PartialEvent,
  );

  collector.command = createCommand(collector, commonHandleCommand);

  // Initialize destinations after collector is fully created
  // Sources are initialized in startFlow after ELB source is created
  collector.destinations = await initDestinations(
    collector,
    initConfig.destinations || {},
  );

  return collector;
}
