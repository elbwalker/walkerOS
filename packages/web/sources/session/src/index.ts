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

  const runSessionStart = (): void => {
    sessionStart({
      ...settings,
      window: env.window,
      document: env.document,
      collector: collectorInterface as Collector.Instance,
    });
  };

  // Session detection runs in init() (Pass 2 of initSources), not the factory
  // (Pass 1), so construction stays side-effect free.
  //
  // Consent-gated (settings.consent): sessionStart registers a single consent
  // rule with the collector, which replays it at the run barrier and guarantees
  // exactly-once delivery, so the source does not react to consent itself.
  //
  // Ungated: the emit must wait for the run lifecycle. Calling sessionStart in
  // init() would push `session start` while the collector is not yet `allowed`,
  // dropping it at the dormant destination gate. Registering an on('run') rule
  // defers the emit into the now-allowed pipeline.
  const init = async (): Promise<void> => {
    if (settings.consent) {
      runSessionStart();
    } else {
      await command('on', { type: 'run', rules: [() => runSessionStart()] });
    }
  };

  return {
    type: 'session',
    config: fullConfig,
    push: elb,
    init,
  };
};

export default sourceSession;
