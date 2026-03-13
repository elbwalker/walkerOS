import type { Trigger } from '@walkeros/core';

/** Sets window.CookieFirst.consent before source init. */
export const trigger: Trigger.SetupFn = (input, env) => {
  if (!input || typeof input !== 'object') return;
  (env.window as Record<string, unknown>).CookieFirst = { consent: input };
};
