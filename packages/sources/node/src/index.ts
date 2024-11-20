import type { SourceNode } from './types';
import { handleCommand, handleEvent } from './lib/handle';
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
  const client = '3.1.1'; // Client version
  const state = getState(customConfig);
  const instance: SourceNode.Instance = {
    client,
    ...state,
    push: (() => {}) as unknown as SourceNode.Elb, // Placeholder for the actual push function
  };

  // Overwrite the push function with the instance-reference
  instance.push = createPush(instance, handleCommand, handleEvent);

  // That's when the party starts
  run(instance);

  return instance;
}

export default createSourceNode;
