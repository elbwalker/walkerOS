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
  const { elb, push, command } = env;

  const settings: Settings = {
    ...config?.settings,
  };

  const fullConfig: Source.Config<Types> = {
    settings,
  };

  // Minimal collector interface for sessionStart. `push` is the collector's
  // source pipeline (so this source's next/before/mapping and status apply to
  // `session start`); `command` carries the identity updates, which are
  // commands and must stay off the pipeline.
  const collectorInterface: Partial<Collector.Instance> = {
    push,
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
  // Ungated: the emit waits for the run lifecycle for ORDERING, not for loss
  // protection. Pushing `session start` from init() would not lose it (the
  // collector holds pre-run events and replays them at run), but the replay
  // lands ahead of everything the run lifecycle itself emits. Registering an
  // on('run') rule emits directly into the now-allowed pipeline instead.
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
    // The outward-facing slot, deliberately `elb` and not the pipeline `push`:
    // this source captures nothing from callers, it emits `session start`
    // itself (via collectorInterface above, which does use the pipeline).
    push: elb,
    init,
  };
};

export default sourceSession;
