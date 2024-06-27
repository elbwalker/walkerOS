import type { WebClient } from '../types';
import { Hooks } from '@elbwalker/types';

export function addHook<Hook extends keyof Hooks.Functions>(
  instance: WebClient.Instance,
  name: Hook,
  hookFn: Hooks.Functions[Hook],
) {
  instance.hooks[name] = hookFn;
}
