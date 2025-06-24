import type { Hooks } from '@walkerOS/types';
import type { WalkerjsWeb } from '../types';

export function addHook<Hook extends keyof Hooks.Functions>(
  instance: WalkerjsWeb.Instance,
  name: Hook,
  hookFn: Hooks.Functions[Hook],
) {
  instance.hooks[name] = hookFn;
}
