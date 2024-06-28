import type { Hooks } from '@elbwalker/types';
import type { WebClient } from '../types';

export function addHook<Hook extends keyof Hooks.Functions>(
  instance: WebClient.Instance,
  name: Hook,
  hookFn: Hooks.Functions[Hook],
) {
  instance.hooks[name] = hookFn;
}
