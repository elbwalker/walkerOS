import type { Elb, ServerCollector } from './types';
import { run } from './lib/run';
import { getState } from './lib/state';
import { getPush } from './lib/push';

// Re-export all core utilities
export * from '@walkerOS/core';

// Types
export * from './types';

// Server utilities
export * from './utils';

export function createServerCollector(
  customConfig?: ServerCollector.InitConfig,
): {
  elb: Elb.Fn;
  collector: ServerCollector.Collector;
} {
  const collector = serverCollector(customConfig);
  const elb = collector.push;

  return { elb, collector };
}

export function serverCollector(
  customConfig: ServerCollector.PartialConfig = {},
): ServerCollector.Collector {
  const version = '0.0.1';
  const state = getState(customConfig);
  const collector: ServerCollector.Collector = {
    ...state,
    version,
    push: (() => {}) as unknown as Elb.Fn, // Placeholder for the actual push function
  };

  // Overwrite the push function with the collector-reference
  collector.push = getPush(collector);

  // That's when the party starts
  run(collector);

  return collector;
}

export default createServerCollector;
