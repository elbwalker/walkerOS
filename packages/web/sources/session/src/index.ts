import type { Source, Collector } from '@walkeros/core';
import { isString, tryCatch } from '@walkeros/core';
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

  // Every push from this source carries its own identity and the page it
  // happened on, like browser events. Without it the collector falls back to
  // `type: 'collector'` and destinations lose the landing URL.
  const sourcePush: Collector.PushFn = (event, options) =>
    push(
      {
        ...event,
        source: {
          type: 'session',
          platform: 'web',
          ...getPageContext(env.window, env.document),
          ...event.source,
        },
      },
      options,
    );

  // Minimal collector interface for sessionStart. `push` is the collector's
  // source pipeline (so this source's next/before/mapping and status apply to
  // `session start`); `command` carries the identity updates, which are
  // commands and must stay off the pipeline.
  const collectorInterface: Partial<Collector.Instance> = {
    push: sourcePush,
    command,
  };

  // A page load has one landing. Later runs (a single-page app calling
  // `walker run` per route change) keep the per-run bookkeeping but pass
  // isStart: false, so the landing never starts a session twice.
  let detected = false;

  const runSessionStart = (): void => {
    sessionStart({
      ...settings,
      ...(detected ? { isStart: false } : {}),
      window: env.window,
      document: env.document,
      collector: collectorInterface as Collector.Instance,
    });
    detected = true;
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
  // on('run') rule emits directly into the now-allowed pipeline instead. The
  // rule fires on every run, but only the first one detects a start.
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

/**
 * Page context read when the event is emitted, so SPA navigations are
 * reflected. Fields without a readable value are omitted, including when a
 * getter throws, so the push itself never fails.
 */
function getPageContext(
  envWindow: Window | undefined,
  envDocument: Document | undefined,
): { url?: string; referrer?: string } {
  const win = envWindow ?? (typeof window !== 'undefined' ? window : undefined);
  const doc =
    envDocument ?? (typeof document !== 'undefined' ? document : undefined);
  const url = tryCatch((): string | undefined => {
    const href = win?.location?.href;
    return isString(href) ? href : undefined;
  })();
  const referrer = tryCatch((): string | undefined => {
    const value = doc?.referrer;
    return isString(value) ? value : undefined;
  })();
  return {
    ...(url !== undefined ? { url } : {}),
    ...(referrer !== undefined ? { referrer } : {}),
  };
}

export default sourceSession;
