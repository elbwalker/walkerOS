import type { Ingest, Source, Collector } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { sourceBrowser, __resetInstanceCountForTests } from '../index';
import type { Types } from '../types';

// The controller chains exclusively on promises (`.then`/await), so yielding
// to the microtask queue repeatedly settles it. The turn count must exceed the
// deepest chain any test builds: a backlog of N serialized links, each of whose
// dispatch (translate → collector.elb → push) itself spans a few awaits. The
// deepest suite case (multi-entry backlog replayed on run) stays well under 25;
// the margin keeps the helper robust without touching the suite's fake timers,
// which never advance `setTimeout` on their own.
const CHAIN_DRAIN_TURNS = 25;

/**
 * Drains the microtask queue so the elbLayer controller's serialized chain
 * links settle before assertions.
 */
export const flushChain = async (): Promise<void> => {
  for (let i = 0; i < CHAIN_DRAIN_TURNS; i++) await Promise.resolve();
};

/**
 * Test helper to create browser sources for testing
 * Returns the source instance with elb function for test compatibility
 */
export async function createBrowserSource(
  collector: Collector.Instance,
  settings: Partial<Source.Settings<Types>> = {},
  options: { runOnInit?: boolean } = {},
): Promise<Source.Instance<Types> & { elb: Function }> {
  const { runOnInit = false } = options;
  const config: Partial<Source.Config<Types>> = {
    settings: {
      prefix: 'data-elb',
      scope: document,
      pageview: false,
      elb: 'elb',
      elbLayer: 'elbLayer',
      ...settings,
    },
  };

  // Use Source.Env with collector functions and browser globals
  const env: Source.Env<Types> = {
    push: collector.push,
    command: collector.command,
    elb: collector.elb,
    window,
    document,
    logger: createMockLogger(),
  };

  // Reset the single-instance invariant so each test can create a fresh source.
  __resetInstanceCountForTests();

  // Call sourceBrowser directly with context pattern
  const source = await sourceBrowser({
    collector,
    config,
    env,
    id: 'test-browser',
    logger: createMockLogger(),
    // Browser sources don't actually call withScope (single tab scope).
    // Stub provided only to satisfy the Source.Context contract.
    withScope: async (_raw, respond, body) => {
      const ingest: Ingest = createIngest('test-browser');
      return body({ ...env, push: env.push, ingest, respond });
    },
  });

  // Mirror collector pass-2 init — the factory body is side-effect-free; init
  // performs elbLayer drain, DOM trigger setup, and window.elb assignment.
  await source.init?.();

  if (runOnInit) {
    // Drive the run lifecycle so non-walker queue items + pageview replay.
    // The controller's replay/pageview run on a fire-and-forget chain, so
    // settle the microtask queue before returning to the caller.
    await source.on?.('run', collector);
    await flushChain();
  }

  // Use the source's own push method which includes proper translation
  return { ...source, elb: source.push };
}

/**
 * Drive the source's destroy lifecycle. The DestroyFn contract requires a
 * LifecycleContext; the browser source ignores it (it tears down closure
 * state), but a valid one is supplied so the call type-checks without casts.
 */
export async function destroyBrowserSource(
  source: Source.Instance<Types>,
  collector: Collector.Instance,
): Promise<void> {
  await source.destroy?.({
    id: 'test-browser',
    config: source.config,
    env: {
      push: collector.push,
      command: collector.command,
      elb: collector.elb,
      window,
      document,
      logger: createMockLogger(),
    },
    logger: createMockLogger(),
  });
}
