import type { Elb, SourceNode } from './types';
import { run } from './lib/run';
import { getState } from './lib/state';
import { createPush } from './lib/push';

// Types
export * from './types';

export function createSourceNode(customConfig?: SourceNode.InitConfig) {
  const instance = sourceNode(customConfig);
  const elb = instance.push;

  return { elb, instance };
}

export function sourceNode(
  customConfig: SourceNode.PartialConfig = {},
): SourceNode.Instance {
  const version = '3.3.0'; // Source version
  const state = getState(customConfig);
  const instance: SourceNode.Instance = {
    version,
    ...state,
    push: (() => {}) as unknown as Elb.Fn, // Placeholder for the actual push function
    on: {}, // Initialize empty on handlers
  };

  // Overwrite the push function with the instance-reference
  instance.push = createPush(instance);

  // That's when the party starts
  run(instance);

  return instance;
}

export default createSourceNode;
