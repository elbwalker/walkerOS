import type { Hooks } from '@walkerOS/types';
import type { WebCollector } from '../types';

export function addHook<Hook extends keyof Hooks.Functions>(
  collector: WebCollector.Collector,
  name: Hook,
  hookFn: Hooks.Functions[Hook],
) {
  collector.hooks[name] = hookFn;
}
