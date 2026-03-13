import type { Trigger } from '@walkeros/core';

/** Pushes step example input to window.dataLayer after source init. */
export const trigger: Trigger.SetupFn = (input, env) => {
  const win = env.window as Window & { dataLayer?: unknown[] };
  if (!win.dataLayer) win.dataLayer = [];
  win.dataLayer.push(input);
};
