import type { Source } from '@walkeros/core';

/** Sets window.CookieFirst.consent before source init. */
export const setup: Source.SetupFn = (input, env) => {
  if (!input || typeof input !== 'object') return;
  (env.window as Record<string, unknown>).CookieFirst = { consent: input };
};
