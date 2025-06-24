import type { NodeCollector, Elb } from '../types';
import { createPush } from '@walkerOS/utils';
import { handleCommand } from './handle';

export function getPush(instance: NodeCollector.Instance): Elb.Fn {
  return createPush<NodeCollector.Instance, Elb.Fn>(
    instance,
    handleCommand,
    () => ({
      timing: Math.round((Date.now() - instance.timing) / 10) / 100,
      source: { type: 'node', id: '', previous_id: '' },
    }),
  );
}
