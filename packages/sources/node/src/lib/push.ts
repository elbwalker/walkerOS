import type { SourceNode, Elb } from '../types';
import { createPush } from '@elbwalker/utils';
import { handleCommand } from './handle';

export function getPush(instance: SourceNode.Instance): Elb.Fn {
  return createPush<SourceNode.Instance, Elb.Fn>(
    instance,
    handleCommand,
    () => ({
      timing: Math.round((Date.now() - instance.timing) / 10) / 100,
      source: { type: 'node', id: '', previous_id: '' },
    }),
  );
}
