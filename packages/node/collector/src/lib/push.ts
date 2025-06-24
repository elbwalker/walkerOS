import type { WalkerjsNode, Elb } from '../types';
import { createPush } from '@walkerOS/utils';
import { handleCommand } from './handle';

export function getPush(instance: WalkerjsNode.Instance): Elb.Fn {
  return createPush<WalkerjsNode.Instance, Elb.Fn>(
    instance,
    handleCommand,
    () => ({
      timing: Math.round((Date.now() - instance.timing) / 10) / 100,
      source: { type: 'node', id: '', previous_id: '' },
    }),
  );
}
