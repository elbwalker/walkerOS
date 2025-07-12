import type { ServerCollector, Elb } from '../types';
import { createPush } from '@walkerOS/core';
import { handleCommand } from './handle';

export function getPush(collector: ServerCollector.Collector): Elb.Fn {
  return createPush<ServerCollector.Collector, Elb.Fn>(
    collector,
    handleCommand,
    () => ({
      timing: Math.round((Date.now() - collector.timing) / 10) / 100,
      source: { type: 'server', id: '', previous_id: '' },
    }),
  );
}
