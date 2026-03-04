import type { Source } from '@walkeros/core';

/** Dispatches ucEvent CustomEvent after source init (trigger pattern). */
export const setup: Source.SetupFn = (input, env) => {
  if (!input || typeof input !== 'object') return;
  return () => {
    env.window.dispatchEvent(new CustomEvent('ucEvent', { detail: input }));
  };
};
