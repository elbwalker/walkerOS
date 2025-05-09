import type { Elb, SourceWalkerjs } from './types';
import { addDestination, onApply } from '@elbwalker/utils';
import { sessionStart } from '@elbwalker/utils/web';
import { getPush, elbLayerInit } from './lib/push';
import { run } from './lib/run';
import { createSessionStart } from './lib/session';
import { getState } from './lib/state';
import { createElb, initGlobalTrigger, ready } from './lib/trigger';
import { getAllEvents, getEvents, getGlobals } from './lib/walker';
import { dataLayerDestination } from './lib/destination';

// Export types and elb
export * from './types';

export const elb: Elb.Fn = createElb();

export function createSourceWalkerjs(
  customConfig?: SourceWalkerjs.InitConfig,
): {
  elb: Elb.Fn;
  instance: SourceWalkerjs.Instance;
} {
  const instance = Walkerjs(customConfig);
  const elb = instance.push;

  return { elb, instance };
}

export function Walkerjs(
  customConfig: SourceWalkerjs.InitConfig = {},
): SourceWalkerjs.Instance {
  const version = '3.4.2'; // Source version
  const state = getState(customConfig);
  const instance: SourceWalkerjs.Instance = {
    ...state,
    version,
    // Placeholder functions to be overwritten with instance-reference
    push: (() => {}) as unknown as Elb.Fn,
    getAllEvents,
    getEvents,
    getGlobals,
    sessionStart: (() => {}) as unknown as typeof sessionStart,
  };

  const { config } = instance;

  // Overwrite the push function with the instance-reference
  instance.push = getPush(instance);
  instance.sessionStart = createSessionStart(instance);

  // Setup pushes via elbLayer
  elbLayerInit(instance);

  // Assign instance and/or elb to the window object
  if (config.elb)
    (window as unknown as Record<string, unknown>)[config.elb] = createElb(
      config.elbLayer,
    );
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
