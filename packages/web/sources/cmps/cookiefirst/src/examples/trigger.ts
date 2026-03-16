/** Sets window.CookieFirst.consent before source init. */
export const trigger = (input: unknown, env: Record<string, unknown>): void => {
  if (!input || typeof input !== 'object') return;
  (env.window as Record<string, unknown>).CookieFirst = { consent: input };
};
