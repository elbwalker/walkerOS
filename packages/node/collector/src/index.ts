import type { Elb, NodeCollector } from './types';
import { run } from './lib/run';
import { getState } from './lib/state';
import { getPush } from './lib/push';

// Types
export * from './types';

// Node utilities
export * from './utils';

export function createNodeCollector(customConfig?: NodeCollector.InitConfig): {
  elb: Elb.Fn;
  instance: NodeCollector.Instance;
} {
  const instance = nodeCollector(customConfig);
  const elb = instance.push;

  return { elb, instance };
}

// Legacy export for backward compatibility
export function createWalkerjsNode(customConfig?: NodeCollector.InitConfig): {
  elb: Elb.Fn;
  instance: NodeCollector.Instance;
} {
  return createNodeCollector(customConfig);
}

export function nodeCollector(
  customConfig: NodeCollector.PartialConfig = {},
): NodeCollector.Instance {
  const version = '0.0.1'; // Source version
  const state = getState(customConfig);
  const instance: NodeCollector.Instance = {
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

// Legacy export for backward compatibility
export function Walkerjs(
  customConfig: NodeCollector.PartialConfig = {},
): NodeCollector.Instance {
  return nodeCollector(customConfig);
}

export default createNodeCollector;
