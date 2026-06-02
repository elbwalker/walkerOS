import type { Source, Collector } from '@walkeros/core';
import type { Types, Settings } from './types';
import { sessionStart } from './lib';

// Export types for external usage
export * as SourceSession from './types';

// Export lib functions for direct usage
export { sessionStart, sessionStorage, sessionWindow } from './lib';
export type {
  SessionConfig,
  SessionCallback,
  SessionFunction,
  SessionStorageConfig,
  SessionWindowConfig,
} from './lib';

/**
 * Session source implementation.
 *
 * This source handles session detection and management.
 */
export const sourceSession: Source.Init<Types> = async (context) => {
  const { config, env } = context;
  const { elb, command } = env;

  const settings: Settings = {
    ...config?.settings,
  };

  const fullConfig: Source.Config<Types> = {
    settings,
  };

  // Create minimal collector interface for sessionStart
  const collectorInterface: Partial<Collector.Instance> = {
    push: elb,
    command,
  };

  // Run session detection in init() (Pass 2 of initSources), not the factory
  // (Pass 1), so construction stays side-effect free. When `settings.consent`
  // is set this registers a single consent rule with the collector; the
  // collector then guarantees exactly-once delivery per state change, so the
  // source does not need to react to consent events itself. Deferring to init()
  // keeps that single registration but moves the emit out of construction,
  // where it would race source merge order.
  const init = async (): Promise<void> => {
    sessionStart({
      ...settings,
      window: env.window,
      document: env.document,
      collector: collectorInterface as Collector.Instance,
    });
  };

  return {
    type: 'session',
    config: fullConfig,
    push: elb,
    init,
  };
};

export default sourceSession;
