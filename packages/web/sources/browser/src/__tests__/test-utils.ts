import type { Ingest, Source, Collector } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { sourceBrowser } from '../index';
import type { Types } from '../types';

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
    elb: collector.sources.elb.push,
    window,
    document,
    logger: createMockLogger(),
  };

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
    await source.on?.('run', collector);
  }

  // Use the source's own push method which includes proper translation
  return { ...source, elb: source.push };
}
