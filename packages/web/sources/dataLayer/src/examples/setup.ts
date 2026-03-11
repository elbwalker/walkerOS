import type { Source } from '@walkeros/core';

/** Prepopulates window.dataLayer before source init. */
export const setup: Source.SetupFn = (input, env) => {
  const win = env.window as Window & { dataLayer?: unknown[] };
  if (!win.dataLayer) win.dataLayer = [];

  if (Array.isArray(input)) {
    for (const item of input) win.dataLayer.push(item);
  } else if (input && typeof input === 'object') {
    win.dataLayer.push(input);
  }
};
