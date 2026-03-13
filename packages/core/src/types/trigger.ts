/**
 * Trigger — converts step example `in` data into a source's native invocation.
 * Used by both simulation (CLI/MCP) and testing (stepExamples.test.ts).
 *
 * Web sources: Use Trigger.SetupFn (takes input + env, returns void or post-init fn).
 * Server sources: createTrigger(instance) => Trigger.Fn<Content, Result>
 */
export type Fn<TContent = unknown, TResult = void> = (
  content: TContent,
) => TResult;

/** Environment provided to web source triggers during simulation. */
export interface SimulationEnv {
  window: Window & typeof globalThis;
  document: Document;
  localStorage: Storage;
  [key: string]: unknown;
}

/**
 * Web source trigger function.
 * Runs BEFORE startFlow() to prepare the environment.
 * Return void for sources that need no post-init action.
 * Return a () => void trigger for sources that dispatch
 * events AFTER startFlow() (e.g., usercentrics CustomEvent).
 */
export type SetupFn = (
  input: unknown,
  env: SimulationEnv,
) => void | (() => void);
