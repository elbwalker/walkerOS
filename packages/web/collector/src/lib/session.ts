import type { WalkerOS } from '@walkerOS/types';
import type { WebCollector } from '../types';
import type { SessionCallback } from '../utils';
import { assign, isSameType, onApply, useHooks } from '@walkerOS/utils';
import { sessionStart as sessionStartOrg } from '../utils';

export function createSessionStart(collector: WebCollector.Collector) {
  return function (
    options: WebCollector.SessionStartOptions = {},
  ): void | WalkerOS.SessionData {
    const { config = {}, ...otherOptions } = options;
    return sessionStart(collector, {
      config: { pulse: true, ...config },
      data: { ...collector.session, updated: Date.now() },
      ...otherOptions,
    });
  };
}

export function sessionStart(
  collector: WebCollector.Collector,
  options: WebCollector.SessionStartOptions = {},
): void | WalkerOS.SessionData {
  const sessionConfig = assign(collector.config.session || {}, options.config);
  const sessionData = assign(collector.config.sessionStatic, options.data);

  // A wrapper for the callback
  const cb: SessionCallback = (session, collector, defaultCb) => {
    let result: void | undefined | WalkerOS.SessionData;
    if (sessionConfig.cb !== false)
      // Run either the default callback or the provided one
      result = (sessionConfig.cb || defaultCb)(session, collector, defaultCb);

    if (isSameType(collector, {} as WebCollector.Collector)) {
      // Assign the session
      collector.session = session;

      // Run on session events
      onApply(collector, 'session');
    }

    return result;
  };

  const session = useHooks(
    sessionStartOrg,
    'SessionStart',
    collector.hooks,
  )({
    ...sessionConfig, // Session detection configuration
    cb, // Custom wrapper callback
    data: sessionData, // Static default session data
    collector,
  });

  return session;
}
