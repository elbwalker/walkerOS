import type { Trigger } from '@walkeros/core';

/** Sets OptanonActiveGroups and OneTrust globals before source init. */
export const trigger: Trigger.SetupFn = (input, env) => {
  const win = env.window as Window & Record<string, unknown>;
  if (typeof input !== 'string') return;
  win.OptanonActiveGroups = input;
  win.OneTrust = { IsAlertBoxClosed: () => true };
};
