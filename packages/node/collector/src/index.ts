import type { Elb, WalkerjsNode } from './types';
import { run } from './lib/run';
import { getState } from './lib/state';
import { getPush } from './lib/push';

// Types
export * from './types';

// Node utilities
export * from './utils';

export function createWalkerjsNode(customConfig?: WalkerjsNode.InitConfig): {
  elb: Elb.Fn;
  instance: WalkerjsNode.Instance;
} {
  const instance = Walkerjs(customConfig);
  const elb = instance.push;

  return { elb, instance };
}

export function Walkerjs(
  customConfig: WalkerjsNode.PartialConfig = {},
): WalkerjsNode.Instance {
  const version = '0.0.1'; // Source version
  const state = getState(customConfig);
  const instance: WalkerjsNode.Instance = {
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

export default createWalkerjsNode;
