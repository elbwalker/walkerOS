/** Sets OptanonActiveGroups and OneTrust globals before source init. */
export const trigger = (input: unknown, env: Record<string, unknown>): void => {
  const win = env.window as Window & Record<string, unknown>;
  if (typeof input !== 'string') return;
  win.OptanonActiveGroups = input;
  win.OneTrust = { IsAlertBoxClosed: () => true };
};
