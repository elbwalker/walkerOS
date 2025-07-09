import type { Elb, WebCollector } from './types';
import { addDestination, onApply } from '@walkerOS/core';
import { sessionStart } from './utils/';
import { getPush, elbLayerInit } from './lib/push';
import { run } from './lib/run';
import { createSessionStart } from './lib/session';
import { getState } from './lib/state';
import { createElb, initGlobalTrigger, ready } from './lib/trigger';
import { getAllEvents, getEvents, getGlobals } from './lib/walker';
import { dataLayerDestination } from './lib/destination';

// Export types and elb
export * from './types';

// Tagger utility
export { default as tagger } from './tagger';
export * from './tagger/types/index.d';

// Walker utilities
export * from './lib/walker';

// Web utilities
export * from './utils';

export const elb: Elb.Fn = createElb();

export function createWebCollector(customConfig?: WebCollector.InitConfig): {
  elb: Elb.Fn;
  collector: WebCollector.Collector;
} {
  const collector = webCollector(customConfig);
  const elb = collector.push;

  return { elb, collector };
}

export function webCollector(
  customConfig: WebCollector.InitConfig = {},
): WebCollector.Collector {
  const version = '0.0.1';
  const state = getState(customConfig);
  const collector: WebCollector.Collector = {
    ...state,
    version,
    // Placeholder functions to be overwritten with collector-reference
    push: (() => {}) as unknown as Elb.Fn,
    getAllEvents,
    getEvents,
    getGlobals,
    sessionStart: (() => {}) as unknown as typeof sessionStart,
  };

  const { config } = collector;

  // Overwrite the push function with the collector-reference
  collector.push = getPush(collector);
  collector.sessionStart = createSessionStart(collector);

  // Setup pushes via elbLayer
  elbLayerInit(collector);

  // Assign collector and/or elb to the window object
  if (config.elb)
    (window as unknown as Record<string, unknown>)[config.elb] = createElb(
      config.elbLayer,
    );
  if (config.name)
    (window as unknown as Record<string, unknown>)[config.name] = collector;

  // Run on events for default consent states
  onApply(collector, 'consent');

  // Add default destination to push events to dataLayer
  if (config.dataLayer)
    addDestination(collector, dataLayerDestination(), config.dataLayerConfig);

  // Automatically start running
  if (config.run) ready(collector, run, collector);

  // Register trigger like click, submit, etc.
  initGlobalTrigger(collector);

  // Let's get it on!
  return collector;
}

export default webCollector;
