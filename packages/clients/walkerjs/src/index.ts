import type { WebClient } from './types';
import { sessionStart } from '@elbwalker/utils';
import { addDestination } from './lib/destination';
import { onApply } from './lib/on';
import { createPush, elbLayerInit } from './lib/push';
import { run } from './lib/run';
import { createSessionStart } from './lib/session';
import { getState } from './lib/state';
import { elb, initGlobalTrigger, ready } from './lib/trigger';
import { getAllEvents, getEvents, getGlobals } from './lib/walker';
import { dataLayerDestination } from './lib/destination';

// Export types and elb
export * from './types';
export { elb };

export function Walkerjs(
  customConfig: WebClient.InitConfig = {},
): WebClient.Instance {
  const client = '3.0.0-next.3'; // Client version
  const state = getState(customConfig);
  const instance: WebClient.Instance = {
    client,
    ...state,
    // Placeholder functions to be overwritten with instance-reference
    push: (() => {}) as unknown as WebClient.Elb,
    getAllEvents,
    getEvents,
    getGlobals,
    sessionStart: (() => {}) as unknown as typeof sessionStart,
  };

  const { config } = instance;

  // Overwrite the push function with the instance-reference
  instance.push = createPush(instance);
  instance.sessionStart = createSessionStart(instance);

  // Setup pushes via elbLayer
  elbLayerInit(instance);

  // Assign instance and/or elb to the window object
  if (config.elb)
    (window as unknown as Record<string, unknown>)[config.elb] = elb;
  if (config.instance)
    (window as unknown as Record<string, unknown>)[config.instance] = instance;

  // Run on events for default consent states
  onApply(instance, 'consent');

  // Add default destination to push events to dataLayer
  if (config.dataLayer)
    addDestination(instance, dataLayerDestination(), config.dataLayerConfig);

  // Automatically start running
  if (config.run) ready(instance, run, instance);

  // Register trigger like click, submit, etc.
  initGlobalTrigger(instance);

  // Let's get it on!
  return instance;
}

export default Walkerjs;
