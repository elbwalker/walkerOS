/** Pushes step example input to window.dataLayer after source init. */
export const trigger = (input: unknown, env: Record<string, unknown>): void => {
  const win = env.window as Window & { dataLayer?: unknown[] };
  if (!win.dataLayer) win.dataLayer = [];
  win.dataLayer.push(input);
};
