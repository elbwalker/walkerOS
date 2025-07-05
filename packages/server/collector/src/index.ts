import type { Elb, ServerCollector } from './types';
import { run } from './lib/run';
import { getState } from './lib/state';
import { getPush } from './lib/push';

// Types
export * from './types';

// Server utilities
export * from './utils';

export function createServerCollector(customConfig?: ServerCollector.InitConfig): {
  elb: Elb.Fn;
  instance: ServerCollector.Instance;
} {
  const instance = serverCollector(customConfig);
  const elb = instance.push;

  return { elb, instance };
}


export function serverCollector(
  customConfig: ServerCollector.PartialConfig = {},
): ServerCollector.Instance {
  const version = '0.0.1'; // Source version
  const state = getState(customConfig);
  const instance: ServerCollector.Instance = {
    ...state,
    version,
    push: (() => {}) as unknown as Elb.Fn, // Placeholder for the actual push function
    on: {}, // Initialize empty on handlers
  };

  // Overwrite the push function with the instance-reference
  instance.push = getPush(instance);

  // That's when the party starts
  run(instance);

  return instance;
}


export default createServerCollector;
