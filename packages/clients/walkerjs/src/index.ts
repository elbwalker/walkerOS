import type { WebClient } from './types';
import { sessionStart } from '@elbwalker/utils';
import { addDataLayerDestination } from './lib/add';
import { onApply } from './lib/on';
import { createPush, elbLayerInit } from './lib/push';
import { run } from './lib/run';
import { createSessionStart } from './lib/session';
import { getState } from './lib/state';
import { elb, initGlobalTrigger, ready } from './lib/trigger';
import { getAllEvents, getEvents } from './lib/walker';

// Export types and elb
export * from './types';
export { elb };

export function Walkerjs(
  customConfig: WebClient.InitConfig = {},
): WebClient.Instance {
  const client = '2.1.3'; // Client version
  const state = getState(customConfig);
  const instance: WebClient.Instance = {
    client,
    ...state,
    // Placeholder functions to be overwritten with instance-reference
    push: (() => {}) as unknown as WebClient.Elb,
    getAllEvents,
    getEvents,
    sessionStart: (() => {}) as unknown as typeof sessionStart,
  };

  // Overwrite the push function with the instance-reference
  instance.push = createPush(instance);
  instance.sessionStart = createSessionStart(instance);

  // Setup pushes via elbLayer
  elbLayerInit(instance);

  // Assign instance and/or elb to the window object
  if (instance.config.elb)
    (window as unknown as Record<string, unknown>)[instance.config.elb] = elb;
  if (instance.config.instance)
    (window as unknown as Record<string, unknown>)[instance.config.instance] =
      instance;

  // Run on events for default consent states
  onApply(instance, 'consent');

  // Add default destination to push events to dataLayer
  if (instance.config.dataLayer) addDataLayerDestination(instance);

  // Automatically start running
  if (instance.config.run) ready(instance, run, instance);

  // Register trigger like click, submit, etc.
  initGlobalTrigger(instance);

  // Let's get it on!
  return instance;
}

export default Walkerjs;
