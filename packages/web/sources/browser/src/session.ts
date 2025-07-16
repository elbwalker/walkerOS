import type { WalkerOS } from '@walkerOS/core';
import { assign, isSameType, useHooks } from '@walkerOS/core';
import { onApply } from '@walkerOS/collector';
import { sessionStart as sessionStartOrg } from '@walkerOS/web-core';

export interface SessionStartOptions {
  config?: unknown;
  data?: WalkerOS.SessionData;
}

export function createSessionStart(collector: WalkerOS.Collector) {
  return function (
    options: SessionStartOptions = {},
  ): void | WalkerOS.SessionData {
    const { config = {}, data, ...otherOptions } = options;
    return sessionStart(collector, {
      config: Object.assign({ pulse: true }, config),
      data: Object.assign({}, collector.session, {
        updated: Date.now(),
      }) as WalkerOS.SessionData,
      ...otherOptions,
    });
  };
}

export function sessionStart(
  collector: WalkerOS.Collector,
  options: SessionStartOptions = {},
): void | WalkerOS.SessionData {
  const sessionConfig = assign(
    collector.config.session || {},
    options.config || {},
  );
  const sessionData = assign(
    collector.config.sessionStatic || {},
    options.data || {},
  );

  // A wrapper for the callback
  const cb = (
    session: WalkerOS.SessionData,
    collector: WalkerOS.Collector,
    defaultCb: unknown,
  ) => {
    let result: void | undefined | WalkerOS.SessionData;
    if ((sessionConfig as any).cb !== false)
      // Run either the default callback or the provided one
      result = ((sessionConfig as any).cb || defaultCb)(
        session,
        collector,
        defaultCb,
      );

    // Assign the session
    collector.session = session;

    // Run on session events
    onApply(collector, 'session');

    return result;
  };

  const session = useHooks(
    sessionStartOrg,
    'SessionStart',
    collector.hooks,
  )({
    ...sessionConfig, // Session detection configuration
    cb: cb as any, // Custom wrapper callback
    data: sessionData, // Static default session data
    collector,
  });

  return session;
}
