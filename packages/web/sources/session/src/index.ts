import type { Source, On, Collector } from '@walkeros/core';
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
    group: undefined,
    command,
  };

  // Initialize session using local lib
  sessionStart({
    ...settings,
    collector: collectorInterface as Collector.Instance,
  });

  // Handle events pushed from collector (consent, session, ready, run)
  const handleEvent = async (event: On.Types) => {
    if (event === 'consent') {
      // Re-initialize session on consent changes
      sessionStart({
        ...settings,
        collector: collectorInterface as Collector.Instance,
      });
    }
  };

  return {
    type: 'session',
    config: fullConfig,
    push: elb,
    on: handleEvent,
  };
};

export default sourceSession;
