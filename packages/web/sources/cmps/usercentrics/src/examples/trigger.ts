import type { Trigger } from '@walkeros/core';

/** Dispatches ucEvent CustomEvent after source init (post-init trigger). */
export const trigger: Trigger.SetupFn = (input, env) => {
  if (!input || typeof input !== 'object') return;
  return () => {
    env.window.dispatchEvent(new CustomEvent('ucEvent', { detail: input }));
  };
};
