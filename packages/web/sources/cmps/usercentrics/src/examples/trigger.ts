/** Dispatches ucEvent CustomEvent after source init (post-init trigger). */
export const trigger = (
  input: unknown,
  env: Record<string, unknown>,
): void | (() => void) => {
  if (!input || typeof input !== 'object') return;
  return () => {
    (env.window as Window).dispatchEvent(
      new CustomEvent('ucEvent', { detail: input }),
    );
  };
};
