import type { NodeClient } from './types';
import { handleCommand, handleEvent } from './lib/handle';
import { run } from './lib/run';
import { getState } from './lib/state';
import { createPush } from './lib/push';

// Types
export * from './types';

export function createNodeClient(customConfig?: NodeClient.InitConfig) {
  const instance = nodeClient(customConfig);
  const elb = instance.push;

  return { elb, instance };
}

export function nodeClient(
  customConfig: NodeClient.PartialConfig = {},
): NodeClient.Instance {
  const client = '2.0.0'; // Client version
  const state = getState(customConfig);
  const instance: NodeClient.Instance = {
    client,
    ...state,
    push: (() => {}) as unknown as NodeClient.Elb, // Placeholder for the actual push function
  };

  // Overwrite the push function with the instance-reference
  instance.push = createPush(instance, handleCommand, handleEvent);

  // That's when the party starts
  run(instance);

  return instance;
}

export default createNodeClient;
