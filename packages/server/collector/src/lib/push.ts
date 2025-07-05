import type { ServerCollector, Elb } from '../types';
import { createPush } from '@walkerOS/utils';
import { handleCommand } from './handle';

export function getPush(instance: ServerCollector.Instance): Elb.Fn {
  return createPush<ServerCollector.Instance, Elb.Fn>(
    instance,
    handleCommand,
    () => ({
      timing: Math.round((Date.now() - instance.timing) / 10) / 100,
      source: { type: 'server', id: '', previous_id: '' },
    }),
  );
}
