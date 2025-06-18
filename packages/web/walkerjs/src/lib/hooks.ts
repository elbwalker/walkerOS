import type { Hooks } from '@elbwalker/types';
import type { SourceWalkerjs } from '../types';

export function addHook<Hook extends keyof Hooks.Functions>(
  instance: SourceWalkerjs.Instance,
  name: Hook,
  hookFn: Hooks.Functions[Hook],
) {
  instance.hooks[name] = hookFn;
}
