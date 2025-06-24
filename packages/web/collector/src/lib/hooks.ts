import type { Hooks } from '@walkerOS/types';
import type { WebCollector } from '../types';

export function addHook<Hook extends keyof Hooks.Functions>(
  instance: WebCollector.Instance,
  name: Hook,
  hookFn: Hooks.Functions[Hook],
) {
  instance.hooks[name] = hookFn;
}
